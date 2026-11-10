/**
 * Outbound transactional email (invitations, password resets, operator alerts) over HTTPS, so it
 * works on hosts that block SMTP ports. Two transports:
 *
 *  - `resend`: the Resend REST API (RESEND_API_KEY + EMAIL_FROM).
 *  - `webhook`: a JSON POST of `{ to, subject, text, html }` to EMAIL_WEBHOOK_URL, e.g. a Zapier
 *    Catch Hook wired to "Email by Zapier", for deployments without an email provider.
 *
 * Sending never throws: callers get `{ sent: false }` and the failure is logged without the
 * recipient address or message body (both can carry one-time links).
 */

export type EmailProvider = "resend" | "webhook" | "none";

export interface MailerConfig {
  resendApiKey: string | null;
  webhookUrl: string | null;
  from: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  log?: (event: string, data: Record<string, unknown>) => void;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Short machine label for logs ("invitation", "password_reset", "alert"). */
  kind: string;
}

export interface SendResult {
  sent: boolean;
  provider: EmailProvider;
}

const RESEND_URL = "https://api.resend.com/emails";

/** Escapes text for inclusion in HTML email bodies. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export class Mailer {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: MailerConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  get provider(): EmailProvider {
    if (this.config.resendApiKey) return "resend";
    if (this.config.webhookUrl) return "webhook";
    return "none";
  }

  get enabled(): boolean {
    return this.provider !== "none";
  }

  async send(message: EmailMessage): Promise<SendResult> {
    const provider = this.provider;
    if (provider === "none") return { sent: false, provider };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 8000);
    // Log the recipient's domain only: the local part is personal data.
    const domain = message.to.split("@")[1]?.slice(0, 100) ?? "";
    try {
      const res =
        provider === "resend"
          ? await this.fetchImpl(RESEND_URL, {
              method: "POST",
              headers: { Authorization: `Bearer ${this.config.resendApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: this.config.from,
                to: [message.to],
                subject: message.subject,
                text: message.text,
                ...(message.html ? { html: message.html } : {}),
              }),
              signal: controller.signal,
            })
          : await this.fetchImpl(this.config.webhookUrl!, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: message.to,
                from: this.config.from,
                subject: message.subject,
                text: message.text,
                html: message.html ?? null,
                kind: message.kind,
              }),
              signal: controller.signal,
            });
      if (!res.ok) {
        this.config.log?.("email.failed", { provider, kind: message.kind, status: res.status, domain });
        return { sent: false, provider };
      }
      return { sent: true, provider };
    } catch (err) {
      this.config.log?.("email.failed", {
        provider,
        kind: message.kind,
        domain,
        error: err instanceof Error ? err.name : "error",
      });
      return { sent: false, provider };
    } finally {
      clearTimeout(timer);
    }
  }
}
