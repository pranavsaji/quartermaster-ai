import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type { AppContext } from "../../context";
import { AppError } from "../../errors";

/** PayPal signs a transmission time; deliveries outside this window are refused as replays/garbage. */
export const WEBHOOK_MAX_SKEW_MS = 5 * 60_000;
/** PayPal event bodies are a few KB; anything far larger is not a PayPal delivery. */
export const WEBHOOK_MAX_BYTES = 64 * 1024;

const TRANSMISSION_ID = /^[A-Za-z0-9-]{1,64}$/;
const TRANSMISSION_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})$/;
const HEADER_LIMITS = {
  "paypal-auth-algo": 64,
  "paypal-cert-url": 512,
  "paypal-transmission-id": 64,
  "paypal-transmission-sig": 2048,
  "paypal-transmission-time": 40,
} as const;

const malformed = (message: string) => new AppError(400, "WEBHOOK_MALFORMED", message);

/**
 * Cheap, local checks that run before a PayPal webhook costs anything: before the body is read,
 * before the database, and before the OAuth + verify-webhook-signature calls to PayPal. Without
 * them any client could make the API call PayPal once per request. Signature verification itself
 * still happens in services/webhooks.ts.
 */
export function paypalWebhookGuard(ctx: AppContext): RequestHandler {
  return (req, _res, next) => {
    const length = req.get("content-length");
    if (length !== undefined && (!/^\d{1,9}$/.test(length) || Number(length) > WEBHOOK_MAX_BYTES)) {
      return next(new AppError(413, "PAYLOAD_TOO_LARGE", "Webhook body is too large."));
    }
    for (const [name, max] of Object.entries(HEADER_LIMITS)) {
      const value = req.get(name);
      if (!value || value.length > max) return next(malformed("Missing or oversized PayPal transmission headers."));
    }
    if (!TRANSMISSION_ID.test(req.get("paypal-transmission-id")!)) return next(malformed("Malformed PayPal transmission id."));
    const time = req.get("paypal-transmission-time")!;
    const sent = TRANSMISSION_TIME.test(time) ? Date.parse(time) : Number.NaN;
    if (!Number.isFinite(sent)) return next(malformed("Malformed PayPal transmission time."));
    if (Math.abs(ctx.now().getTime() - sent) > WEBHOOK_MAX_SKEW_MS) {
      return next(new AppError(400, "WEBHOOK_STALE", "PayPal transmission time is outside the accepted window."));
    }
    next();
  };
}

/** Per-source-IP limit for webhook deliveries, independent of the authenticated API's limiter. */
export function paypalWebhookLimiter(ctx: AppContext): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: ctx.config.rateLimits.webhookPerMinute,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many webhook deliveries." } },
  });
}
