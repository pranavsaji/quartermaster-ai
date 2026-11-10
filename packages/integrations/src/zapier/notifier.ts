import type { Mailer } from "../email/mailer";
import { renderEmail, type EmailDetail, type EmailTone } from "../email/template";

/**
 * Outbound notifications through a Zapier Catch Hook and/or email to the workspace's owners.
 * Notification-only: nothing received from Zapier (or any messaging channel) can approve a
 * purchase. Failures are logged and reported through `onFailure`, never thrown.
 */

export type NotifyChannel = "zapier" | "email" | "both";

/** One failed delivery. Carries no recipient address and no notification content. */
export interface NotifyFailure {
  channel: "zapier" | "email";
  kind: NotificationKind;
  /** HTTP status from the provider, when it answered. */
  status?: number;
  /** Short machine reason: `http`, `network`, `send_failed`, `recipients_failed`. */
  reason: string;
}

export interface NotifierConfig {
  webhookUrl: string | null;
  appBaseUrl: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  log?: (event: string, data: Record<string, unknown>) => void;
  /** Which channels deliver notifications. Defaults to `zapier`. */
  channel?: NotifyChannel;
  /** Transactional mailer for the email channel. */
  mailer?: Mailer;
  /** Addresses that receive an organisation's email notifications (its owners). */
  recipients?: (organizationId: string) => Promise<string[]>;
  /** Called once per failed delivery (e.g. to record a deduplicated warning). Errors it throws are ignored. */
  onFailure?: (failure: NotifyFailure) => unknown;
}

export type NotificationKind = "APPROVAL_REQUIRED" | "PURCHASE_BLOCKED" | "PAYMENT_COMPLETED" | "INVOICE_FLAGGED" | "DELIVERY_DELAYED";

export interface Notification {
  kind: NotificationKind;
  organization_id: string;
  /** Also the email subject. */
  title: string;
  /** One or two plain sentences. */
  summary: string;
  amount_minor?: number;
  currency?: string;
  link_path?: string;
  /** Label/value rows for the email's details table (order, supplier, amount, date…). */
  details?: EmailDetail[];
}

/** How each kind reads in an email: status band, tone and the button. */
const EMAIL_STYLE: Record<NotificationKind, { status: string; tone: EmailTone; action: string }> = {
  PAYMENT_COMPLETED: { status: "Payment completed", tone: "success", action: "View the order" },
  APPROVAL_REQUIRED: { status: "Approval needed", tone: "attention", action: "Review and approve" },
  PURCHASE_BLOCKED: { status: "Purchase blocked", tone: "blocked", action: "See why" },
  INVOICE_FLAGGED: { status: "Invoice held", tone: "blocked", action: "Review the invoice" },
  DELIVERY_DELAYED: { status: "Delivery delayed", tone: "attention", action: "Open the schedule" },
};

/**
 * The ready-to-send email for a notification, so the Zap's email step only maps
 * `email_subject`, `email_html` and `email_text` (no formatting lives in Zapier).
 */
export function notificationEmail(n: Notification, link: string): { subject: string; html: string; text: string } {
  const style = EMAIL_STYLE[n.kind];
  const { html, text } = renderEmail({
    preheader: n.summary,
    status: style.status,
    tone: style.tone,
    title: n.title,
    paragraphs: [n.summary],
    details: n.details,
    action: { label: style.action, href: link },
    footnote: "Informational only: nothing in this email can approve or pay. Approvals and payments happen in Quartermaster.",
  });
  return { subject: n.title.slice(0, 200), html, text };
}

export class Notifier {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: NotifierConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  private get channel(): NotifyChannel {
    return this.config.channel ?? "zapier";
  }

  /** Zapier delivery is on: a Catch Hook is configured and the channel includes it. */
  get zapierEnabled(): boolean {
    return Boolean(this.config.webhookUrl) && this.channel !== "email";
  }

  /** Email delivery is on: a mailer and a recipient lookup are configured and the channel includes it. */
  get emailEnabled(): boolean {
    return Boolean(this.config.mailer?.enabled && this.config.recipients) && this.channel !== "zapier";
  }

  get enabled(): boolean {
    return this.zapierEnabled || this.emailEnabled;
  }

  private link(n: Notification): string {
    return n.link_path ? new URL(n.link_path, this.config.appBaseUrl).toString() : this.config.appBaseUrl;
  }

  private failed(failure: NotifyFailure): void {
    this.config.log?.("notify.failed", { ...failure });
    try {
      const pending = this.config.onFailure?.(failure);
      if (pending instanceof Promise) pending.catch(() => undefined);
    } catch {
      // Reporting a failed notification must never fail the caller.
    }
  }

  /** The JSON posted to the Catch Hook: the notification, its link, and the finished email. */
  payload(n: Notification): Record<string, unknown> {
    const link = this.link(n);
    const email = notificationEmail(n, link);
    return {
      ...n,
      link,
      sent_at: new Date().toISOString(),
      notice: "Informational only. Approvals must be made in Quartermaster.",
      email_subject: email.subject,
      email_html: email.html,
      email_text: email.text,
    };
  }

  /** Delivers on every enabled channel. Never throws. */
  async send(n: Notification): Promise<void> {
    await Promise.all([this.zapierEnabled ? this.sendZapier(n) : null, this.emailEnabled ? this.sendEmail(n) : null]);
  }

  private async sendZapier(n: Notification): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 5000);
    try {
      const res = await this.fetchImpl(this.config.webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.payload(n)),
        signal: controller.signal,
      });
      if (!res.ok) this.failed({ channel: "zapier", kind: n.kind, status: res.status, reason: "http" });
    } catch (err) {
      this.failed({ channel: "zapier", kind: n.kind, reason: err instanceof Error && err.name === "AbortError" ? "timeout" : "network" });
    } finally {
      clearTimeout(timer);
    }
  }

  private async sendEmail(n: Notification): Promise<void> {
    let to: string[];
    try {
      to = await this.config.recipients!(n.organization_id);
    } catch {
      return this.failed({ channel: "email", kind: n.kind, reason: "recipients_failed" });
    }
    if (to.length === 0) return;
    const email = notificationEmail(n, this.link(n));
    let failures = 0;
    for (const address of to) {
      const result = await this.config.mailer!.send({
        to: address,
        subject: email.subject,
        text: email.text,
        html: email.html,
        kind: "notification",
      });
      if (!result.sent) failures++;
    }
    // One report per notification, however many owners it was addressed to.
    if (failures > 0) this.failed({ channel: "email", kind: n.kind, reason: "send_failed" });
  }
}
