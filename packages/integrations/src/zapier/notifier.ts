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
  title: string;
  summary: string;
  amount_minor?: number;
  currency?: string;
  link_path?: string;
}

export class Notifier {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: NotifierConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  get enabled(): boolean {
    return Boolean(this.config.webhookUrl);
  }

  async send(n: Notification): Promise<void> {
    if (!this.config.webhookUrl) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 5000);
    try {
      const res = await this.fetchImpl(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...n,
          link: n.link_path ? new URL(n.link_path, this.config.appBaseUrl).toString() : this.config.appBaseUrl,
          sent_at: new Date().toISOString(),
          notice: "Informational only. Approvals must be made in Quartermaster.",
        }),
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
