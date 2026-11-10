/**
 * Minimal Sentry forwarder using the envelope endpoint. It sends only the sanitised fields the
 * error tracker hands it (no request bodies, headers or cookies), so nothing the SDK would
 * auto-collect can leak. Failures are swallowed: error reporting must never cause errors.
 */
import { randomUUID } from "node:crypto";

export interface SentryConfig {
  dsn: string | null;
  environment: string;
  release: string | null;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface SentryEvent {
  level: "warning" | "error" | "fatal";
  /** Groups events in Sentry the same way the local tracker groups them. */
  fingerprint: string;
  type: string;
  message: string;
  /** Low-cardinality labels (source, code, route). */
  tags: Record<string, string>;
  /** Free-form context; values are already sanitised. */
  extra?: Record<string, unknown>;
  stack?: string;
}

interface ParsedDsn {
  endpoint: string;
  dsn: string;
}

/** `https://<key>@<host>/<project>` → envelope URL with the key as a query parameter. */
export function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const project = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!url.username || !/^\d+$/.test(project.split("/").pop() ?? "")) return null;
    const projectId = project.split("/").pop()!;
    const prefix = project.split("/").slice(0, -1).join("/");
    const base = `${url.protocol}//${url.host}${prefix ? `/${prefix}` : ""}`;
    const endpoint = `${base}/api/${projectId}/envelope/?sentry_key=${encodeURIComponent(url.username)}&sentry_version=7`;
    return { endpoint, dsn };
  } catch {
    return null;
  }
}

export class SentryForwarder {
  private readonly parsed: ParsedDsn | null;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: SentryConfig) {
    this.parsed = config.dsn ? parseDsn(config.dsn) : null;
    this.fetchImpl = config.fetch ?? fetch;
  }

  get enabled(): boolean {
    return this.parsed !== null;
  }

  async capture(event: SentryEvent): Promise<boolean> {
    if (!this.parsed) return false;
    const eventId = randomUUID().replace(/-/g, "");
    const now = new Date();
    const payload = {
      event_id: eventId,
      timestamp: now.getTime() / 1000,
      platform: "node",
      level: event.level,
      environment: this.config.environment,
      ...(this.config.release ? { release: this.config.release } : {}),
      fingerprint: [event.fingerprint],
      tags: event.tags,
      extra: { ...event.extra, ...(event.stack ? { stack: event.stack } : {}) },
      exception: { values: [{ type: event.type, value: event.message }] },
    };
    const body = [
      JSON.stringify({ event_id: eventId, sent_at: now.toISOString(), dsn: this.parsed.dsn }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(payload),
    ].join("\n");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 5000);
    try {
      const res = await this.fetchImpl(this.parsed.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-sentry-envelope" },
        body,
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
