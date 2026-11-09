import { eq } from "drizzle-orm";
import { z } from "zod";
import { SETTLED_PAYMENT_STATUSES, decimalStringToMinor, type RefundStatus } from "@qm/contracts";
import { paymentAttempts, paypalWebhookEvents } from "@qm/database";
import { PayPalNotConfiguredError, type WebhookEvent, type WebhookHeaders } from "@qm/payments";
import type { AppContext } from "../context";
import { AppError, badRequest, unavailable } from "../errors";
import { appendAudit } from "./audit";
import { recordFinding } from "./findings";
import { reconcilePayment, recordReportedRefund } from "./payments";

export type WebhookOutcome = "PROCESSED" | "DUPLICATE" | "IGNORED";

/** Events that move money back to the buyer; handled against the capture they reference. */
const REFUND_EVENTS = new Set(["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"]);

function refundStatusOf(status: unknown): RefundStatus {
  return status === "PENDING" || status === "FAILED" || status === "CANCELLED" ? status : "COMPLETED";
}

/** Structural validation of a webhook body before anything is read from it. */
const WebhookEventShape = z.object({
  id: z.string().min(1).max(128),
  event_type: z.string().min(1).max(128),
  resource: z.record(z.string(), z.unknown()),
});

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
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw badRequest("Malformed webhook body");
  }
  const shape = WebhookEventShape.safeParse(parsed);
  if (!shape.success) throw badRequest("Malformed webhook event");
  // Verification needs the event exactly as PayPal sent it, so keep the parsed object.
  const event = parsed as WebhookEvent & z.infer<typeof WebhookEventShape>;

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
    if (ctx.now().getTime() - lastInvalidFindingAt > 60_000 && orderId) {
      lastInvalidFindingAt = ctx.now().getTime();
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
    const orderId = event.event_type.startsWith("CHECKOUT.ORDER.")
      ? resourceId
      : event.event_type.startsWith("PAYMENT.CAPTURE.") && !REFUND_EVENTS.has(event.event_type)
        ? relatedOrderId(event.resource)
        : null;

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
    } else if (REFUND_EVENTS.has(event.event_type)) {
      const captureId = upLinkCaptureId(event.resource);
      const [p] = captureId ? await ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.paypalCaptureId, captureId)) : [];
      const amount = event.resource.amount as { value?: unknown; currency_code?: unknown } | undefined;
      if (p && resourceId && typeof amount?.value === "string" && typeof amount.currency_code === "string") {
        orgId = p.organizationId;
        // A refund can be reported before our capture finalisation has been applied. Reconcile
        // first; if the payment is still not settled, fail so PayPal redelivers later.
        if (!(SETTLED_PAYMENT_STATUSES as readonly string[]).includes(p.status)) {
          const status = await reconcilePayment(ctx, p.id);
          if (!(SETTLED_PAYMENT_STATUSES as readonly string[]).includes(status)) {
            throw new AppError(503, "REFUND_BEFORE_CAPTURE", "Capture not yet recorded; retry later.");
          }
        }
        const reversal = event.event_type === "PAYMENT.CAPTURE.REVERSED";
        const applied = await recordReportedRefund(ctx, p.id, {
          paypalRefundId: resourceId,
          amountMinor: decimalStringToMinor(amount.value, amount.currency_code),
          // A reversal moves money back immediately; a refund event carries the refund's status.
          status: reversal ? "COMPLETED" : refundStatusOf(event.resource.status),
          kind: reversal ? "REVERSAL" : "REFUND",
          eventId: event.id,
        });
        outcome = "PROCESSED";
        resultText = `${reversal ? "reversal" : "refund"} ${applied.toLowerCase()}`;
      } else {
        resultText = p ? "refund event without amount" : "no matching payment";
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
