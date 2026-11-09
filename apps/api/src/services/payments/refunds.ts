import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { SETTLED_PAYMENT_STATUSES, minorToDecimalString, type PaymentDto, type PaymentStatus, type RefundStatus } from "@qm/contracts";
import { refunds, type DbOrTx } from "@qm/database";
import type { PayPalRefund } from "@qm/payments";
import type { AppContext } from "../../context";
import { badGateway, conflict, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { reduceSpend } from "../budget";
import type { Actor } from "../common";
import { recordFinding } from "../findings";
import { toPaymentDto } from "../orders";
import { isAmbiguousPayPalFailure, loadPayment, loadPaymentForSystem, patchPayment, paypalFailureCode, requirePayPal, type PaymentRow, transitionPayment } from "./shared";

type RefundRow = typeof refunds.$inferSelect;

/** Refunds whose outcome is not final yet: no other refund may start while one exists. */
const IN_FLIGHT_REFUND: RefundStatus[] = ["REQUESTED", "UNKNOWN", "PENDING"];

const toRefundStatus = (s: string | undefined): RefundStatus =>
  s === "COMPLETED" || s === "PENDING" || s === "FAILED" || s === "CANCELLED" ? s : "UNKNOWN";

/**
 * Records the outcome of a refund on a locked payment. Money is only counted once PayPal reports
 * the refund COMPLETED, and only once per refund row (re-applying a COMPLETED refund is a no-op).
 * Returns true when this call applied the amount.
 */
export async function settleRefund(
  tx: DbOrTx,
  payment: PaymentRow,
  refund: RefundRow,
  status: RefundStatus,
  paypalRefundId: string | null,
  now: Date,
): Promise<boolean> {
  if (refund.status === "COMPLETED") return false;
  await tx
    .update(refunds)
    .set({ status, paypalRefundId: paypalRefundId ?? refund.paypalRefundId })
    .where(eq(refunds.id, refund.id));
  if (status !== "COMPLETED") return false;
  const refunded = payment.refundedAmountMinor + refund.amountMinor;
  const next: PaymentStatus = refunded >= (payment.capturedAmountMinor ?? 0) ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (!(await transitionPayment(tx, payment, next, { refundedAmountMinor: refunded }, now))) {
    await patchPayment(tx, payment.id, { refundedAmountMinor: refunded }, now);
  }
  await reduceSpend(tx, payment.intentId, refund.amountMinor, now);
  return true;
}

/**
 * Owner-authorised refund. Each logical refund has a stable request key derived from the
 * client's Idempotency-Key, so a retry after a timeout reuses the same PayPal-Request-Id and
 * PayPal returns the original refund instead of paying out twice. While a refund's outcome is
 * unknown or pending, no other refund can start for that payment.
 */
export async function refundPayment(
  ctx: AppContext,
  actor: Actor,
  paymentId: string,
  amountMinor: number | undefined,
  reason: string,
  idempotencyKey: string,
): Promise<PaymentDto> {
  requirePayPal(ctx);
  const requestKey = `${paymentId}:${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 32)}`;
  const prepared = await ctx.db.transaction(async (tx) => {
    const p = await loadPayment(tx, actor.organizationId, paymentId, true);
    if (!["COMPLETED", "PARTIALLY_REFUNDED"].includes(p.status) || !p.paypalCaptureId || p.capturedAmountMinor === null) {
      throw conflict("NOT_REFUNDABLE", `Payment is ${p.status}.`);
    }
    const [existing] = await tx.select().from(refunds).where(eq(refunds.requestKey, requestKey));
    if (existing && (existing.status === "COMPLETED" || existing.status === "PENDING")) return { done: true as const, payment: p };
    if (existing) return { done: false as const, refund: existing, payment: p };

    const inFlight = await tx
      .select({ id: refunds.id })
      .from(refunds)
      .where(and(eq(refunds.paymentAttemptId, p.id), inArray(refunds.status, IN_FLIGHT_REFUND)));
    if (inFlight.length > 0) throw conflict("REFUND_IN_PROGRESS", "Another refund for this payment has not completed yet. Retry it first.");
    const refundable = p.capturedAmountMinor - p.refundedAmountMinor;
    const amount = amountMinor ?? refundable;
    if (amount <= 0 || amount > refundable) throw unprocessable("REFUND_AMOUNT_INVALID", `Refund must be between 1 and ${refundable}.`);
    const [r] = await tx
      .insert(refunds)
      .values({ organizationId: actor.organizationId, paymentAttemptId: p.id, requestKey, amountMinor: amount, status: "REQUESTED", reason, createdBy: actor.id })
      .returning();
    return { done: false as const, refund: r!, payment: p };
  });
  if (prepared.done) return toPaymentDto(prepared.payment);

  let refund: PayPalRefund;
  try {
    refund = await ctx.paypal.refundCapture(
      prepared.payment.paypalCaptureId!,
      `qm-refund-${createHash("sha256").update(requestKey).digest("hex").slice(0, 40)}`,
      { currency_code: prepared.payment.currency, value: minorToDecimalString(prepared.refund.amountMinor, prepared.payment.currency) },
      reason,
    );
  } catch (err) {
    const code = paypalFailureCode(err, "REFUND_ERROR");
    const status: RefundStatus = isAmbiguousPayPalFailure(err) ? "UNKNOWN" : "FAILED";
    ctx.log.warn({ err, payment_id: paymentId, refund_id: prepared.refund.id, code, status }, "PayPal refund failed");
    await ctx.db.update(refunds).set({ status }).where(eq(refunds.id, prepared.refund.id));
    throw badGateway("PAYPAL_REFUND_FAILED", "PayPal did not confirm the refund. Retry with the same request to resolve it.", { code, outcome: status });
  }

  return ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    const p = await loadPayment(tx, actor.organizationId, paymentId, true);
    // The webhook may already have recorded this refund (and counted it) under PayPal's id.
    const [recorded] = refund.id ? await tx.select().from(refunds).where(eq(refunds.paypalRefundId, refund.id)) : [];
    if (recorded && recorded.id !== prepared.refund.id) {
      await tx.delete(refunds).where(eq(refunds.id, prepared.refund.id));
      return toPaymentDto(p);
    }
    const [row] = await tx.select().from(refunds).where(eq(refunds.id, prepared.refund.id));
    const status = toRefundStatus(refund.status);
    await settleRefund(tx, p, row!, status, refund.id, now);
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "payment.refunded",
      actorType: "USER",
      actorId: actor.id,
      entityType: "payment_attempt",
      entityId: p.id,
      data: { amount_minor: row!.amountMinor, paypal_refund_id: refund.id, status, reason },
    });
    return toPaymentDto(await loadPayment(tx, actor.organizationId, paymentId));
  });
}

/**
 * Applies a refund or reversal reported by PayPal (webhook) to a captured payment. Idempotent per
 * PayPal refund id. A reversal (chargeback) also raises a HIGH security finding.
 */
export async function recordReportedRefund(
  ctx: AppContext,
  paymentId: string,
  report: { paypalRefundId: string; amountMinor: number; status: RefundStatus; kind: "REFUND" | "REVERSAL"; eventId: string },
): Promise<"APPLIED" | "RECORDED" | "DUPLICATE"> {
  return ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    // Lock the payment first so the API refund path and this handler serialise.
    const payment = await loadPaymentForSystem(tx, paymentId, true);
    if (!payment) return "DUPLICATE";
    if (!(SETTLED_PAYMENT_STATUSES as readonly string[]).includes(payment.status)) {
      throw conflict("REFUND_BEFORE_CAPTURE", "Capture not yet recorded; retry later.");
    }
    let [row] = await tx.select().from(refunds).where(eq(refunds.paypalRefundId, report.paypalRefundId));
    if (!row) {
      [row] = await tx
        .insert(refunds)
        .values({
          organizationId: payment.organizationId,
          paymentAttemptId: payment.id,
          paypalRefundId: report.paypalRefundId,
          amountMinor: report.amountMinor,
          status: "REQUESTED",
          reason: report.kind === "REVERSAL" ? "Reversed by PayPal (chargeback or reversal)" : "Reported by PayPal webhook",
        })
        .returning();
    }
    const applied = await settleRefund(tx, payment, row!, report.status, report.paypalRefundId, now);
    await appendAudit(tx, {
      organizationId: payment.organizationId,
      action: report.kind === "REVERSAL" ? "payment.reversal_reported" : "payment.refund_reported",
      actorType: "PAYPAL",
      entityType: "payment_attempt",
      entityId: payment.id,
      data: { event_id: report.eventId, amount_minor: report.amountMinor, status: report.status, applied },
    });
    if (report.kind === "REVERSAL" && applied) {
      await recordFinding(tx, {
        organizationId: payment.organizationId,
        type: "PAYMENT_REVERSED",
        severity: "HIGH",
        title: "PayPal reversed a captured payment",
        description: `PayPal reversed ${minorToDecimalString(report.amountMinor, payment.currency)} ${payment.currency} of a captured payment (chargeback or reversal).`,
        sourceKind: "payment_attempt",
        sourceId: payment.id,
        evidence: { paypal_refund_id: report.paypalRefundId, event_id: report.eventId },
        relatedPurchaseOrderId: payment.purchaseOrderId,
      });
    }
    return applied ? "APPLIED" : row!.status === "COMPLETED" && report.status === "COMPLETED" ? "DUPLICATE" : "RECORDED";
  });
}
