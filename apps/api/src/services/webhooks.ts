import { and, eq, sql } from "drizzle-orm";
import { decimalStringToMinor } from "@qm/contracts";
import { paymentAttempts, paypalWebhookEvents, refunds } from "@qm/database";
import { PayPalNotConfiguredError, type WebhookEvent, type WebhookHeaders } from "@qm/payments";
import { canTransition } from "@qm/trustrail";
import type { PaymentStatus } from "@qm/contracts";
import type { AppContext } from "../context";
import { AppError, badRequest, unavailable } from "../errors";
import { appendAudit } from "./audit";
import { reduceSpend } from "./budget";
import { recordFinding } from "./findings";
import { reconcilePayment } from "./payments";

export type WebhookOutcome = "PROCESSED" | "DUPLICATE" | "IGNORED";

/** Rate-limits findings for invalid signatures so a flood cannot fill the security log. */
let lastInvalidFindingAt = 0;

function relatedOrderId(resource: Record<string, unknown>): string | null {
  const supp = resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined;
  return supp?.related_ids?.order_id ?? null;
}

function upLinkCaptureId(resource: Record<string, unknown>): string | null {
  const links = (resource.links as { href: string; rel: string }[] | undefined) ?? [];
  const up = links.find((l) => l.rel === "up" && /\/captures\//.test(l.href));
  return up ? (up.href.split("/captures/")[1]?.split(/[/?]/)[0] ?? null) : null;
}

/**
 * Verified, deduplicated PayPal webhook processing. Webhooks never move a payment forward on
 * their own say-so: the handler re-reads the order from PayPal and applies the authoritative
 * state through the same monotonic reconciliation path the capture endpoint uses.
 */
export async function handlePayPalWebhook(ctx: AppContext, headers: WebhookHeaders, rawBody: Buffer): Promise<WebhookOutcome> {
  if (!ctx.paypal.webhookConfigured) throw unavailable("WEBHOOKS_NOT_CONFIGURED", "PayPal webhooks are not configured.");
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody.toString("utf8")) as WebhookEvent;
  } catch {
    throw badRequest("Malformed webhook body");
  }
  if (!event || typeof event.id !== "string" || typeof event.event_type !== "string" || typeof event.resource !== "object") {
    throw badRequest("Malformed webhook event");
  }

  let verified = false;
  try {
    verified = await ctx.paypal.verifyWebhook(headers, event);
  } catch (err) {
    if (err instanceof PayPalNotConfiguredError) throw unavailable("WEBHOOKS_NOT_CONFIGURED", err.message);
    // PayPal unreachable: respond 5xx so PayPal redelivers later.
    throw new AppError(503, "WEBHOOK_VERIFICATION_UNAVAILABLE", "Could not verify the webhook right now.");
  }
  if (!verified) {
    ctx.log.warn({ event_id: event.id, event_type: event.event_type }, "rejected webhook with invalid signature");
    // Unverified events are never stored under their claimed id (that would let a forger
    // pre-empt the genuine event). Record a rate-limited finding instead.
    const resourceId = typeof event.resource.id === "string" ? event.resource.id : null;
    const orderId = relatedOrderId(event.resource) ?? resourceId;
    if (Date.now() - lastInvalidFindingAt > 60_000 && orderId) {
      lastInvalidFindingAt = Date.now();
      const [p] = await ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.paypalOrderId, orderId));
      if (p) {
        await recordFinding(ctx.db, {
          organizationId: p.organizationId,
          type: "WEBHOOK_SIGNATURE_INVALID",
          severity: "HIGH",
          title: "Rejected a PayPal webhook with an invalid signature",
          description: `An event claiming to be ${event.event_type} failed signature verification and was ignored.`,
          sourceKind: "paypal_webhook",
          sourceId: null,
          evidence: { claimed_event_id: event.id.slice(0, 64), event_type: event.event_type.slice(0, 64) },
          relatedPurchaseOrderId: p.purchaseOrderId,
        });
      }
    }
    throw new AppError(400, "WEBHOOK_SIGNATURE_INVALID", "Webhook signature verification failed.");
  }

  const resourceId = typeof event.resource.id === "string" ? event.resource.id : null;
  const inserted = await ctx.db
    .insert(paypalWebhookEvents)
    .values({ eventId: event.id, eventType: event.event_type, resourceId, verified: true, payload: event as unknown as Record<string, unknown> })
    .onConflictDoNothing({ target: paypalWebhookEvents.eventId })
    .returning({ id: paypalWebhookEvents.id });
  if (inserted.length === 0) {
    const [prev] = await ctx.db.select().from(paypalWebhookEvents).where(eq(paypalWebhookEvents.eventId, event.id));
    if (prev?.processed) return "DUPLICATE";
  }

  let outcome: WebhookOutcome = "IGNORED";
  let resultText = "ignored";
  let orgId: string | null = null;
  try {
    const orderId =
      event.event_type.startsWith("CHECKOUT.ORDER.") ? resourceId : event.event_type.startsWith("PAYMENT.CAPTURE.") && event.event_type !== "PAYMENT.CAPTURE.REFUNDED" ? relatedOrderId(event.resource) : null;

    if (orderId) {
      const [p] = await ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.paypalOrderId, orderId));
      if (p) {
        orgId = p.organizationId;
        const status = await reconcilePayment(ctx, p.id);
        outcome = "PROCESSED";
        resultText = `reconciled to ${status}`;
        await appendAudit(ctx.db, { organizationId: p.organizationId, action: "paypal.webhook_processed", actorType: "PAYPAL", entityType: "payment_attempt", entityId: p.id, data: { event_id: event.id, event_type: event.event_type, status } });
      } else {
        resultText = "no matching payment";
      }
    } else if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = upLinkCaptureId(event.resource);
      const [p] = captureId ? await ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.paypalCaptureId, captureId)) : [];
      if (p) {
        orgId = p.organizationId;
        const amount = event.resource.amount as { value?: string; currency_code?: string } | undefined;
        const refundMinor = amount?.value && amount.currency_code ? decimalStringToMinor(amount.value, amount.currency_code) : 0;
        // A refund can be reported before our capture finalisation has been applied. Reconcile
        // first; if the payment is still not COMPLETED, fail so PayPal redelivers later.
        if (!["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status)) {
          const status = await reconcilePayment(ctx, p.id);
          if (!["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(status)) {
            throw new AppError(503, "REFUND_BEFORE_CAPTURE", "Capture not yet recorded; retry later.");
          }
        }
        await ctx.db.transaction(async (tx) => {
          // Lock the payment first so the API refund path and this handler serialise.
          const [locked] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, p.id)).for("update");
          const ins = await tx
            .insert(refunds)
            .values({ organizationId: p.organizationId, paymentAttemptId: p.id, paypalRefundId: resourceId, amountMinor: refundMinor, status: String(event.resource.status ?? "COMPLETED"), reason: "Reported by PayPal webhook" })
            .onConflictDoNothing({ target: refunds.paypalRefundId })
            .returning();
          if (ins.length === 0) return; // already recorded via the API path
          const refunded = locked!.refundedAmountMinor + refundMinor;
          const next: PaymentStatus = refunded >= (locked!.capturedAmountMinor ?? 0) ? "REFUNDED" : "PARTIALLY_REFUNDED";
          await tx
            .update(paymentAttempts)
            .set({ refundedAmountMinor: sql`${paymentAttempts.refundedAmountMinor} + ${refundMinor}`, status: canTransition(locked!.status as PaymentStatus, next) ? next : locked!.status, updatedAt: ctx.now() })
            .where(and(eq(paymentAttempts.id, p.id)));
          await reduceSpend(tx, p.intentId, refundMinor, ctx.now());
          await appendAudit(tx, { organizationId: p.organizationId, action: "payment.refund_reported", actorType: "PAYPAL", entityType: "payment_attempt", entityId: p.id, data: { event_id: event.id, amount_minor: refundMinor } });
        });
        outcome = "PROCESSED";
        resultText = "refund recorded";
      }
    }
  } catch (err) {
    // Leave the event unprocessed so PayPal's redelivery is handled rather than dropped as a duplicate.
    await ctx.db
      .update(paypalWebhookEvents)
      .set({ result: `failed: ${err instanceof Error ? err.message.slice(0, 200) : "error"}`, organizationId: orgId })
      .where(eq(paypalWebhookEvents.eventId, event.id));
    if (err instanceof AppError) throw err;
    throw new AppError(503, "WEBHOOK_PROCESSING_FAILED", "Webhook could not be processed; PayPal will retry.");
  }
  await ctx.db
    .update(paypalWebhookEvents)
    .set({ processed: true, result: resultText, organizationId: orgId, processedAt: ctx.now() })
    .where(eq(paypalWebhookEvents.eventId, event.id));
  return outcome;
}
