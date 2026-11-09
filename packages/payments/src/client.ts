import type { z } from "zod";
import { PayPalAmbiguousError, PayPalApiError, PayPalInvalidResponseError, PayPalNotConfiguredError } from "./errors";
import { OAuthTokenSchema, PayPalCaptureSchema, PayPalOrderSchema, PayPalRefundSchema, WebhookVerificationSchema, issuePaths } from "./schemas";
import type { CreateOrderRequest, PayPalCapture, PayPalOrder, PayPalRefund, WebhookEvent, WebhookHeaders } from "./types";

export interface PayPalConfig {
  clientId: string | null;
  clientSecret: string | null;
  environment: "sandbox" | "live";
  webhookId: string | null;
  /** Override for tests or a proxy. */
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Optional structured logger. Never receives secrets or tokens. */
  log?: (event: string, data: Record<string, unknown>) => void;
}

export const PAYPAL_API_BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

export const PAYPAL_SDK_URL = {
  sandbox: "https://www.sandbox.paypal.com/web-sdk/v6/core",
  live: "https://www.paypal.com/web-sdk/v6/core",
} as const;

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Thin PayPal REST client. Every mutating call takes a caller-supplied `PayPal-Request-Id` so
 * retries of the same logical operation are idempotent at PayPal. Every 2xx body is validated
 * (schemas.ts); a malformed one raises PayPalInvalidResponseError, an ambiguous outcome.
 */
export class PayPalClient {
  private token: CachedToken | null = null;
  private tokenInflight: Promise<string> | null = null;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: PayPalConfig) {
    this.baseUrl = config.baseUrl ?? PAYPAL_API_BASE[config.environment];
    this.fetchImpl = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  get configured(): boolean {
    return !!this.config.clientId && !!this.config.clientSecret;
  }

  get webhookConfigured(): boolean {
    return this.configured && !!this.config.webhookId;
  }

  /* ------------------------------------------------------------------ OAuth */

  async getAccessToken(): Promise<string> {
    if (!this.configured) throw new PayPalNotConfiguredError();
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.token;
    if (this.tokenInflight) return this.tokenInflight;
    this.tokenInflight = (async () => {
      const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
      const res = await this.rawFetch("oauth.token", "/v1/oauth2/token", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new PayPalApiError(res.status, body, "oauth.token");
      const token = parseBody("oauth.token", res.status, OAuthTokenSchema, body, this.config.log);
      this.token = { token: token.access_token, expiresAt: Date.now() + (token.expires_in ?? 300) * 1000 };
      return token.access_token;
    })();
    try {
      return await this.tokenInflight;
    } finally {
      this.tokenInflight = null;
    }
  }

  /* ------------------------------------------------------------------ Orders */

  createOrder(body: CreateOrderRequest, requestId: string): Promise<PayPalOrder> {
    return this.request("orders.create", PayPalOrderSchema, "POST", "/v2/checkout/orders", body, {
      "PayPal-Request-Id": requestId,
      Prefer: "return=representation",
    });
  }

  getOrder(orderId: string): Promise<PayPalOrder> {
    return this.request("orders.get", PayPalOrderSchema, "GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  }

  captureOrder(orderId: string, requestId: string): Promise<PayPalOrder> {
    return this.request("orders.capture", PayPalOrderSchema, "POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, {
      "PayPal-Request-Id": requestId,
      Prefer: "return=representation",
    });
  }

  getCapture(captureId: string): Promise<PayPalCapture> {
    return this.request("captures.get", PayPalCaptureSchema, "GET", `/v2/payments/captures/${encodeURIComponent(captureId)}`);
  }

  refundCapture(captureId: string, requestId: string, amount?: { currency_code: string; value: string }, note?: string): Promise<PayPalRefund> {
    return this.request(
      "captures.refund",
      PayPalRefundSchema,
      "POST",
      `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      { ...(amount ? { amount } : {}), ...(note ? { note_to_payer: note.slice(0, 255) } : {}) },
      { "PayPal-Request-Id": requestId, Prefer: "return=representation" },
    );
  }

  /* ---------------------------------------------------------------- Webhooks */

  /**
   * Verifies a webhook through PayPal's verify-webhook-signature API. Returns false for any
   * verification failure; throws only if PayPal could not be reached (caller should 5xx so
   * PayPal retries delivery).
   */
  async verifyWebhook(headers: WebhookHeaders, event: WebhookEvent): Promise<boolean> {
    if (!this.webhookConfigured) throw new PayPalNotConfiguredError();
    const required = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"] as const;
    if (required.some((h) => !headers[h])) return false;
    const certUrl = headers["paypal-cert-url"]!;
    if (!isTrustedCertUrl(certUrl, this.config.environment)) return false;
    try {
      const res = await this.request("webhooks.verify", WebhookVerificationSchema, "POST", "/v1/notifications/verify-webhook-signature", {
        auth_algo: headers["paypal-auth-algo"],
        cert_url: certUrl,
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: this.config.webhookId,
        webhook_event: event,
      });
      return res.verification_status === "SUCCESS";
    } catch (err) {
      if (err instanceof PayPalApiError && err.status >= 400 && err.status < 500) return false;
      throw err;
    }
  }

  /* ----------------------------------------------------------------- Plumbing */

  private async request<T>(operation: string, schema: z.ZodType<T>, method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    const token = await this.getAccessToken();
    const started = Date.now();
    const res = await this.rawFetch(operation, path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { message: text.slice(0, 500) };
    }
    this.config.log?.("paypal.response", {
      operation,
      status: res.status,
      duration_ms: Date.now() - started,
      debug_id: res.headers.get("paypal-debug-id"),
    });
    if (res.status === 401) this.token = null;
    if (!res.ok) throw new PayPalApiError(res.status, parsed, operation);
    return parseBody(operation, res.status, schema, parsed, this.config.log);
  }

  private async rawFetch(operation: string, path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, signal: controller.signal });
    } catch (err) {
      throw new PayPalAmbiguousError(operation, err);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Validates a 2xx body; a mismatch is an ambiguous outcome, never a definite failure. */
function parseBody<T>(operation: string, status: number, schema: z.ZodType<T>, body: unknown, log?: PayPalConfig["log"]): T {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  const invalid = issuePaths(r.error);
  log?.("paypal.invalid_response", { operation, status, invalid });
  throw new PayPalInvalidResponseError(operation, status, invalid);
}

/** Only accept certificate URLs hosted by PayPal over HTTPS. */
export function isTrustedCertUrl(url: string, environment: "sandbox" | "live"): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    const allowed = environment === "sandbox" ? ["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"] : ["api.paypal.com", "api-m.paypal.com"];
    return allowed.includes(host);
  } catch {
    return false;
  }
}
