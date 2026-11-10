import { createHash } from "node:crypto";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { SystemErrorDto } from "@qm/contracts";
import { systemErrors, type Database } from "@qm/database";
import { escapeHtml, redactSecrets, type Mailer, type SentryForwarder } from "@qm/integrations";
import type { Logger } from "../../logger";

export type ErrorSource = "api" | "web" | "job" | "monitor";
export type ErrorLevel = "warning" | "error" | "fatal";

export interface CapturedError {
  source: ErrorSource;
  level: ErrorLevel;
  /** Stable machine code, e.g. `INTERNAL`, `PAYPAL_UNAVAILABLE`, `web.render`, `monitor.capture_pending`. */
  code: string;
  /** Human-readable summary. Authored text or a sanitised exception message. */
  message: string;
  /** Route template (`POST /payments/:id/capture`) or page path with ids replaced. */
  route?: string | null;
  correlationId?: string | null;
  /** The thrown value, for its type and a trimmed stack (kept server-side). */
  err?: unknown;
  /** Small scalar context (counts, ids). Never request bodies, headers or secrets. */
  context?: Record<string, string | number | boolean | null>;
  /** Grouping key override; monitors use a fixed key so one condition is one row. */
  key?: string;
}

export interface TrackerDeps {
  db: Database;
  log: Logger;
  now: () => Date;
  mailer: Mailer;
  sentry: SentryForwarder;
  fetch?: typeof fetch;
  appBaseUrl: string;
  environment: string;
  release: string | null;
  alertEmails: string[];
  alertWebhookUrl: string | null;
  cooldownMinutes: number;
}

export type SystemErrorRow = typeof systemErrors.$inferSelect;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Replaces ids and numbers so the same failure with different values groups together. */
export function normalizeMessage(message: string): string {
  return message
    .replace(UUID_RE, ":id")
    .replace(/\b[0-9A-Z]{12,}\b/g, ":ref")
    .replace(/\d+/g, "N")
    .slice(0, 300);
}

/**
 * Page path for grouping browser errors: query and fragment dropped, at most four segments, and any
 * segment that is not a plain lower-case word becomes `:id`. Reports are unauthenticated input, so
 * this keeps the number of distinct groups small.
 */
export function normalizePath(path: string): string {
  const segments = path
    .split(/[?#]/)[0]!
    .split("/")
    .filter(Boolean)
    .slice(0, 4)
    .map((seg) => (/^[a-z][a-z-]{0,30}$/.test(seg) ? seg : ":id"));
  return `/${segments.join("/")}`;
}

/**
 * Exception text can quote request data. Before it is stored, alerted or sent to Sentry, quoted
 * literals, email addresses, URLs' query strings and secret-shaped tokens are replaced.
 */
export function redactMessage(text: string, max = 500): string {
  const scrubbed = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]")
    .replace(/(https?:\/\/[^\s?#"']+)[?#][^\s"']*/g, "$1?…")
    .replace(/"[^"\n]{1,200}"|'[^'\n]{1,200}'/g, "'…'");
  return redactSecrets(scrubbed, max);
}

export function fingerprintOf(e: Pick<CapturedError, "source" | "code" | "route" | "message" | "key">): string {
  const basis = [e.source, e.code, e.route ?? "", e.key ?? normalizeMessage(e.message)].join("|");
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

function errorType(err: unknown): string {
  if (err instanceof Error) return err.name || "Error";
  return typeof err;
}

function trimmedStack(err: unknown): string | undefined {
  if (!(err instanceof Error) || !err.stack) return undefined;
  // The first line repeats the message; frames are file paths and line numbers.
  const [head = "", ...frames] = err.stack.split("\n");
  return [redactMessage(head, 300), ...frames.slice(0, 14)].join("\n").slice(0, 3000);
}

export function toSystemErrorDto(r: SystemErrorRow): SystemErrorDto {
  return {
    id: r.id,
    fingerprint: r.fingerprint,
    source: r.source,
    level: r.level,
    code: r.code,
    message: r.message,
    route: r.route,
    occurrences: r.occurrences,
    first_seen_at: r.firstSeenAt.toISOString(),
    last_seen_at: r.lastSeenAt.toISOString(),
    last_correlation_id: r.lastCorrelationId,
    last_alerted_at: r.lastAlertedAt?.toISOString() ?? null,
    resolved_at: r.resolvedAt?.toISOString() ?? null,
  };
}

export interface AlertMessage {
  level: ErrorLevel;
  title: string;
  lines: string[];
}

export interface AlertDelivery {
  email_recipients: number;
  emails_sent: number;
  webhook_sent: boolean;
}

/**
 * Error tracking and alerting. Errors are grouped by fingerprint in `system_errors` (count, first
 * and last seen, last correlation id). The first occurrence of an error-level group, a regression
 * after it was resolved, or new occurrences after the cooldown alert the operators by email
 * and/or a Slack-compatible webhook. Each alert is claimed with one conditional UPDATE, so several
 * instances never send the same alert twice. Warnings are recorded but never alert.
 *
 * Nothing here throws: tracking failures are logged and swallowed.
 */
export class ErrorTracker {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly deps: TrackerDeps) {
    this.fetchImpl = deps.fetch ?? fetch;
  }

  get alertChannels(): { email: boolean; webhook: boolean; recipients: number } {
    return {
      email: this.deps.mailer.enabled && this.deps.alertEmails.length > 0,
      webhook: Boolean(this.deps.alertWebhookUrl),
      recipients: this.deps.alertEmails.length,
    };
  }

  async capture(raw: CapturedError): Promise<SystemErrorRow | null> {
    const e = { ...raw, message: redactMessage(raw.message) };
    try {
      const row = await this.record(e);
      if (row && row.level !== "warning") {
        void this.deps.sentry.capture({
          level: row.level,
          fingerprint: row.fingerprint,
          type: e.err ? errorType(e.err) : e.code,
          message: e.message,
          tags: { source: e.source, code: e.code, ...(e.route ? { route: e.route } : {}) },
          extra: { correlation_id: e.correlationId ?? null, ...e.context },
          stack: trimmedStack(e.err),
        });
        await this.maybeAlert(row);
      }
      return row;
    } catch (err) {
      this.deps.log.error({ err, code: e.code }, "error tracking failed");
      return null;
    }
  }

  private async record(e: CapturedError): Promise<SystemErrorRow | null> {
    const now = this.deps.now();
    const fingerprint = fingerprintOf(e);
    const sample = {
      type: e.err ? errorType(e.err) : null,
      stack: trimmedStack(e.err) ?? null,
      ...e.context,
    };
    const [row] = await this.deps.db
      .insert(systemErrors)
      .values({
        fingerprint,
        source: e.source,
        level: e.level,
        code: e.code.slice(0, 80),
        message: e.message.slice(0, 500),
        route: e.route?.slice(0, 200) ?? null,
        sample,
        firstSeenAt: now,
        lastSeenAt: now,
        lastCorrelationId: e.correlationId ?? null,
      })
      .onConflictDoUpdate({
        target: systemErrors.fingerprint,
        set: {
          occurrences: sql`${systemErrors.occurrences} + 1`,
          lastSeenAt: now,
          lastCorrelationId: e.correlationId ?? null,
          message: e.message.slice(0, 500),
          level: e.level,
          sample,
          resolvedAt: null,
        },
      })
      .returning();
    return row ?? null;
  }

  /** Claims and sends an alert for this group if one is due. */
  private async maybeAlert(row: SystemErrorRow): Promise<void> {
    const channels = this.alertChannels;
    if (!channels.email && !channels.webhook) return;
    const now = this.deps.now();
    const cooldownStart = new Date(now.getTime() - this.deps.cooldownMinutes * 60_000);
    const [claimed] = await this.deps.db
      .update(systemErrors)
      .set({ lastAlertedAt: now, alertedOccurrences: sql`${systemErrors.occurrences}` })
      .where(
        and(
          eq(systemErrors.id, row.id),
          sql`${systemErrors.occurrences} > ${systemErrors.alertedOccurrences}`,
          or(isNull(systemErrors.lastAlertedAt), lt(systemErrors.lastAlertedAt, cooldownStart)),
        ),
      )
      .returning();
    if (!claimed) return;
    const newSince = claimed.occurrences - row.alertedOccurrences;
    await this.sendAlert({
      level: claimed.level,
      title: `[${claimed.level.toUpperCase()}] ${claimed.code}: ${claimed.message.slice(0, 120)}`,
      lines: [
        `Source: ${claimed.source}${claimed.route ? ` · ${claimed.route}` : ""}`,
        `Occurrences: ${claimed.occurrences} total, ${newSince} new since the last alert`,
        `First seen: ${claimed.firstSeenAt.toISOString()} · Last seen: ${claimed.lastSeenAt.toISOString()}`,
        ...(claimed.lastCorrelationId ? [`Correlation id: ${claimed.lastCorrelationId}`] : []),
      ],
    });
  }

  /** Sends one alert to every configured channel. Used for error groups and the operator's test alert. */
  async sendAlert(alert: AlertMessage): Promise<AlertDelivery> {
    const link = new URL("/system", this.deps.appBaseUrl).toString();
    const env = `${this.deps.environment}${this.deps.release ? ` @ ${this.deps.release}` : ""}`;
    const text = [alert.title, ...alert.lines, `Environment: ${env}`, `Open: ${link}`].join("\n");
    const result: AlertDelivery = { email_recipients: 0, emails_sent: 0, webhook_sent: false };

    if (this.deps.alertWebhookUrl) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await this.fetchImpl(this.deps.alertWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // `text` is what Slack and Mattermost hooks render; `title`/`summary`/`link` mirror the Zapier
          // notification payload, so the same Catch Hook can email alerts.
          body: JSON.stringify({
            text,
            title: alert.title,
            summary: alert.lines.join("\n"),
            level: alert.level,
            link,
            environment: env,
            kind: "ALERT",
          }),
          signal: controller.signal,
        });
        result.webhook_sent = res.ok;
        if (!res.ok) this.deps.log.warn({ status: res.status }, "alert webhook failed");
      } catch (err) {
        this.deps.log.warn({ error: err instanceof Error ? err.name : "error" }, "alert webhook failed");
      } finally {
        clearTimeout(timer);
      }
    }

    if (this.deps.mailer.enabled) {
      const html = `<p><strong>${escapeHtml(alert.title)}</strong></p><p>${alert.lines.map(escapeHtml).join("<br>")}</p><p>Environment: ${escapeHtml(env)}</p><p><a href="${escapeHtml(link)}">Open the System page</a></p>`;
      for (const to of this.deps.alertEmails) {
        result.email_recipients++;
        const sent = await this.deps.mailer.send({
          to,
          subject: `Quartermaster alert: ${alert.title}`.slice(0, 200),
          text,
          html,
          kind: "alert",
        });
        if (sent.sent) result.emails_sent++;
      }
    }
    return result;
  }

  /** Marks a group resolved; its next occurrence reopens it and alerts again. */
  async resolve(id: string): Promise<SystemErrorRow | null> {
    const [row] = await this.deps.db
      .update(systemErrors)
      .set({ resolvedAt: this.deps.now(), alertedOccurrences: sql`${systemErrors.occurrences}`, lastAlertedAt: null })
      .where(eq(systemErrors.id, id))
      .returning();
    return row ?? null;
  }

  /** Resolves an open monitor condition once it has cleared. */
  async clearMonitor(code: string): Promise<void> {
    try {
      const fingerprint = fingerprintOf({ source: "monitor", code, route: null, message: "", key: code });
      await this.deps.db
        .update(systemErrors)
        .set({ resolvedAt: this.deps.now(), alertedOccurrences: sql`${systemErrors.occurrences}`, lastAlertedAt: null })
        .where(and(eq(systemErrors.fingerprint, fingerprint), isNull(systemErrors.resolvedAt)));
    } catch (err) {
      this.deps.log.error({ err, code }, "clearing monitor failed");
    }
  }

  /** Records a monitor condition under a fixed key, so it stays one row while it persists. */
  async monitor(code: string, level: ErrorLevel, message: string, context?: CapturedError["context"]): Promise<void> {
    await this.capture({ source: "monitor", level, code, message, key: code, route: null, context });
  }

  /** Unresolved groups from one source (bounds groups created by untrusted reports). */
  async openGroups(source: ErrorSource): Promise<number> {
    const [row] = await this.deps.db
      .select({ n: sql<number>`count(*)::int` })
      .from(systemErrors)
      .where(and(eq(systemErrors.source, source), isNull(systemErrors.resolvedAt)));
    return row?.n ?? 0;
  }

  async openCount(): Promise<number> {
    const [row] = await this.deps.db
      .select({ n: sql<number>`count(*)::int` })
      .from(systemErrors)
      .where(and(isNull(systemErrors.resolvedAt), gt(systemErrors.lastSeenAt, new Date(this.deps.now().getTime() - 30 * 86_400_000))));
    return row?.n ?? 0;
  }
}
