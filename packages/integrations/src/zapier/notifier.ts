import { renderEmail, type EmailDetail, type EmailTone } from "../email/template";

/**
 * Outbound notifications through a Zapier Catch Hook. Notification-only: nothing received from
 * Zapier (or any messaging channel) can approve a purchase. Failures are logged, never thrown.
 */

export interface NotifierConfig {
  webhookUrl: string | null;
  appBaseUrl: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  log?: (event: string, data: Record<string, unknown>) => void;
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

  get enabled(): boolean {
    return Boolean(this.config.webhookUrl);
  }

  /** The JSON posted to the Catch Hook: the notification, its link, and the finished email. */
  payload(n: Notification): Record<string, unknown> {
    const link = n.link_path ? new URL(n.link_path, this.config.appBaseUrl).toString() : this.config.appBaseUrl;
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

  async send(n: Notification): Promise<void> {
    if (!this.config.webhookUrl) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 5000);
    try {
      const res = await this.fetchImpl(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.payload(n)),
        signal: controller.signal,
      });
      if (!res.ok) this.config.log?.("notify.failed", { kind: n.kind, status: res.status });
    } catch (err) {
      this.config.log?.("notify.failed", { kind: n.kind, error: err instanceof Error ? err.message : String(err) });
    } finally {
      clearTimeout(timer);
    }
  }
}
