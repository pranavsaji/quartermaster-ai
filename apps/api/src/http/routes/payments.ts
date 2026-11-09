import { Router, raw } from "express";
import { CapturePaymentRequest, RefundRequest } from "@qm/contracts";
import type { WebhookHeaders } from "@qm/payments";
import type { AppContext } from "../../context";
import { verificationDto } from "../../services/certificates";
import { capturePayment, createPayPalOrder, getPayment, refundPayment } from "../../services/payments";
import { handlePayPalWebhook } from "../../services/webhooks";
import { actorOf, requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";
import { idempotent } from "../middleware/idempotency";
import { WEBHOOK_MAX_BYTES } from "../middleware/webhooks";

export function intentAndPaymentRoutes(ctx: AppContext): Router {
  const r = Router();

  r.get(
    "/intents/:id/verify",
    asyncHandler(async (req, res) => {
      res.json(await verificationDto(ctx.db, req.user!.organizationId, param(req, "id"), ctx.now()));
    }),
  );

  r.post(
    "/intents/:id/paypal-order",
    requireRole("OWNER"),
    idempotent(ctx, "payments.create_order", async (req) => ({
      status: 200,
      body: await createPayPalOrder(ctx, actorOf(req), param(req, "id")),
    })),
  );

  r.post(
    "/payments/:id/capture",
    requireRole("OWNER"),
    idempotent(ctx, "payments.capture", async (req) => {
      const input = parse(CapturePaymentRequest, req.body);
      return { status: 200, body: await capturePayment(ctx, actorOf(req), param(req, "id"), input.paypal_order_id) };
    }),
  );

  r.get(
    "/payments/:id",
    asyncHandler(async (req, res) => {
      res.json(await getPayment(ctx, req.user!.organizationId, param(req, "id")));
    }),
  );

  r.post(
    "/payments/:id/refund",
    requireRole("OWNER"),
    idempotent(ctx, "payments.refund", async (req) => {
      const input = parse(RefundRequest, req.body);
      return {
        status: 200,
        body: {
          payment: await refundPayment(ctx, actorOf(req), param(req, "id"), input.amount_minor, input.reason, req.get("idempotency-key")!),
        },
      };
    }),
  );

  return r;
}

/** Mounted before JSON parsing and authentication: PayPal authenticates via signature. */
export function webhookRoutes(ctx: AppContext): Router {
  const r = Router();
  r.post(
    "/webhooks/paypal",
    // The same cap the guard applies to Content-Length, so chunked bodies cannot exceed it.
    raw({ type: "*/*", limit: WEBHOOK_MAX_BYTES }),
    asyncHandler(async (req, res) => {
      const h = (name: string) => req.get(name) ?? undefined;
      const headers: WebhookHeaders = {
        "paypal-auth-algo": h("paypal-auth-algo"),
        "paypal-cert-url": h("paypal-cert-url"),
        "paypal-transmission-id": h("paypal-transmission-id"),
        "paypal-transmission-sig": h("paypal-transmission-sig"),
        "paypal-transmission-time": h("paypal-transmission-time"),
      };
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const outcome = await handlePayPalWebhook(ctx, headers, body);
      res.status(200).json({ received: true, outcome });
    }),
  );
  return r;
}
