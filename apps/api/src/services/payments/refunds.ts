import { createHash } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { isSettledPayment, minorToDecimalString, type PaymentDto, type PaymentStatus, type RefundStatus } from "@qm/contracts";
import { refunds, type DbOrTx } from "@qm/database";
import type { PayPalRefund } from "@qm/payments";
import type { AppContext } from "../../context";
import { badGateway, conflict, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { reduceSpend } from "../budget";
import type { Actor } from "../common";
import { recordFinding } from "../findings";
import { toPaymentDto } from "../orders";
import {
  isAmbiguousPayPalFailure,
  loadPayment,
  loadPaymentForSystem,
  patchPayment,
  paypalFailureCode,
  requirePayPal,
  type PaymentRow,
  transitionPayment,
} from "./shared";

type RefundRow = typeof refunds.$inferSelect;

/** Refunds whose outcome is not final yet: no other refund may start while one exists. */
const IN_FLIGHT_REFUND: RefundStatus[] = ["REQUESTED", "UNKNOWN", "PENDING"];

/** PayPal refund status → ours; anything unexpected stays unresolved (never counted as money). */
export const toRefundStatus = (s: unknown): RefundStatus =>
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

/** PayPal-Request-Id for a logical refund: stable across API retries and sweeper re-issues. */
export const refundRequestId = (requestKey: string) => `qm-refund-${createHash("sha256").update(requestKey).digest("hex").slice(0, 40)}`;

export type RefundIssueOutcome = { kind: "SETTLED"; status: RefundStatus } | { kind: "DECLINED"; code: string } | { kind: "UNKNOWN" };

/**
 * Sends (or re-sends, with the same PayPal-Request-Id) one refund to PayPal and records the
 * answer. PayPal's request-id idempotency means a re-send after a timeout returns the original
 * refund rather than paying out twice. Used by the owner's request and by the sweeper.
 */
export async function issueRefund(
  ctx: AppContext,
  refundId: string,
  actor: { type: "USER"; id: string } | { type: "SYSTEM" },
): Promise<RefundIssueOutcome> {
  const [row] = await ctx.db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!row?.requestKey) return { kind: "UNKNOWN" };
  const payment = await loadPaymentForSystem(ctx.db, row.paymentAttemptId);
  if (!payment?.paypalCaptureId) return { kind: "UNKNOWN" };

  let refund: PayPalRefund;
  try {
    refund = await ctx.paypal.refundCapture(
      payment.paypalCaptureId,
      refundRequestId(row.requestKey),
      { currency_code: payment.currency, value: minorToDecimalString(row.amountMinor, payment.currency) },
      row.reason,
    );
  } catch (err) {
    const code = paypalFailureCode(err, "REFUND_ERROR");
    const status: RefundStatus = isAmbiguousPayPalFailure(err) ? "UNKNOWN" : "FAILED";
    ctx.log.warn({ err, payment_id: payment.id, refund_id: row.id, code, status }, "PayPal refund failed");
    await ctx.db
      .update(refunds)
      .set({ status })
      .where(and(eq(refunds.id, row.id), inArray(refunds.status, ["REQUESTED", "UNKNOWN"])));
    return status === "FAILED" ? { kind: "DECLINED", code } : { kind: "UNKNOWN" };
  }

  return ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    const p = await loadPaymentForSystem(tx, payment.id, true);
    // The webhook may already have recorded this refund (and counted it) under PayPal's id.
    const [recorded] = refund.id ? await tx.select().from(refunds).where(eq(refunds.paypalRefundId, refund.id)) : [];
    if (recorded && recorded.id !== row.id) {
      await tx.delete(refunds).where(eq(refunds.id, row.id));
      return { kind: "SETTLED" as const, status: recorded.status };
    }
    const [fresh] = await tx.select().from(refunds).where(eq(refunds.id, row.id));
    const status = toRefundStatus(refund.status);
    await settleRefund(tx, p!, fresh!, status, refund.id, now);
    await appendAudit(tx, {
      organizationId: p!.organizationId,
      action: "payment.refunded",
      actorType: actor.type,
      actorId: actor.type === "USER" ? actor.id : null,
      entityType: "payment_attempt",
      entityId: p!.id,
      data: { amount_minor: row.amountMinor, paypal_refund_id: refund.id, status, reason: row.reason },
    });
    return { kind: "SETTLED" as const, status };
  });
}

/**
 * Owner-authorised refund. Each logical refund has a stable request key derived from the
 * client's Idempotency-Key, so a retry after a timeout reuses the same PayPal-Request-Id and
 * PayPal returns the original refund instead of paying out twice. While a refund's outcome is
 * unknown or pending, no other refund can start for that payment; the sweeper resolves such
 * refunds even if the client never retries.
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
    const refundable = p.capturedAmountMinor - p.refundedAmountMinor;
    const [existing] = await tx.select().from(refunds).where(eq(refunds.requestKey, requestKey));
    if (existing && (existing.status === "COMPLETED" || existing.status === "PENDING")) return { done: true as const };
    if (existing && (existing.status === "FAILED" || existing.status === "CANCELLED")) {
      throw conflict("REFUND_CLOSED", "PayPal declined this refund. Start a new refund to try again.");
    }

    // Only one unresolved refund per payment (a retry of that same refund is allowed).
    const inFlight = await tx
      .select({ id: refunds.id })
      .from(refunds)
      .where(and(eq(refunds.paymentAttemptId, p.id), inArray(refunds.status, IN_FLIGHT_REFUND)));
    if (inFlight.some((r) => r.id !== existing?.id)) {
      throw conflict("REFUND_IN_PROGRESS", "Another refund for this payment has not completed yet. Retry it first.");
    }
    if (existing) {
      if (existing.amountMinor > refundable) throw unprocessable("REFUND_AMOUNT_INVALID", `Refund must be between 1 and ${refundable}.`);
      return { done: false as const, refundId: existing.id };
    }
    const amount = amountMinor ?? refundable;
    if (amount <= 0 || amount > refundable) throw unprocessable("REFUND_AMOUNT_INVALID", `Refund must be between 1 and ${refundable}.`);
    const [r] = await tx
      .insert(refunds)
      .values({
        organizationId: actor.organizationId,
        paymentAttemptId: p.id,
        requestKey,
        amountMinor: amount,
        status: "REQUESTED",
        reason,
        createdBy: actor.id,
        // The sweeper ages refunds by the application clock, so they are stamped with it.
        createdAt: ctx.now(),
      })
      .returning();
    return { done: false as const, refundId: r!.id };
  });

  if (!prepared.done) {
    const outcome = await issueRefund(ctx, prepared.refundId, { type: "USER", id: actor.id });
    if (outcome.kind === "DECLINED") {
      // PayPal definitively refused: nothing was refunded and a new refund may be requested.
      throw unprocessable("REFUND_DECLINED", "PayPal declined the refund. Nothing was refunded.", { paypal_issue: outcome.code });
    }
    if (outcome.kind === "UNKNOWN") {
      // Retry with the same Idempotency-Key, or let the sweeper resolve it.
      throw badGateway("PAYPAL_REFUND_UNCONFIRMED", "PayPal did not confirm the refund. Retry with the same request to resolve it.", {
        retryable: true,
      });
    }
  }
  return toPaymentDto(await loadPayment(ctx.db, actor.organizationId, paymentId));
}

/**
 * Resolves refunds whose outcome is not final: re-sends REQUESTED/UNKNOWN refunds with their
 * original PayPal-Request-Id (PayPal answers with the original refund if it already happened),
 * and re-reads PENDING refunds. Returns how many were examined.
 */
export async function reconcileRefunds(ctx: AppContext, now: Date, staleMs = 2 * 60_000): Promise<{ examined: number; errors: number }> {
  const cutoff = new Date(now.getTime() - staleMs);
  // Least recently checked first, so refunds that stay PENDING at PayPal for days never starve
  // newer ones out of the batch.
  const open = await ctx.db
    .select()
    .from(refunds)
    .where(and(inArray(refunds.status, ["REQUESTED", "UNKNOWN", "PENDING"]), lt(refunds.createdAt, cutoff)))
    .orderBy(sql`${refunds.lastReconciledAt} asc nulls first`, asc(refunds.createdAt))
    .limit(25);
  let errors = 0;
  for (const r of open) {
    try {
      await ctx.db.update(refunds).set({ lastReconciledAt: now }).where(eq(refunds.id, r.id));
      if (r.paypalRefundId) {
        // PayPal knows this refund: read its state (covers PENDING ones and webhook-reported
        // refunds whose status was not final).
        const remote = await ctx.paypal.getRefund(r.paypalRefundId);
        const status = toRefundStatus(remote.status);
        if (status === "PENDING" || status === "UNKNOWN") continue;
        await ctx.db.transaction(async (tx) => {
          const [fresh] = await tx.select().from(refunds).where(eq(refunds.id, r.id));
          const p = await loadPaymentForSystem(tx, r.paymentAttemptId, true);
          if (!fresh || !p || !IN_FLIGHT_REFUND.includes(fresh.status)) return;
          await settleRefund(tx, p, fresh, status, r.paypalRefundId, ctx.now());
          await appendAudit(tx, {
            organizationId: p.organizationId,
            action: "payment.refund_reconciled",
            actorType: "SYSTEM",
            entityType: "payment_attempt",
            entityId: p.id,
            data: { paypal_refund_id: r.paypalRefundId, status },
          });
        });
      } else if (r.requestKey) {
        // Never reached PayPal as far as we know: re-send with the original request id.
        await issueRefund(ctx, r.id, { type: "SYSTEM" });
      }
    } catch (err) {
      errors++;
      ctx.log.warn({ err, refund_id: r.id }, "refund reconciliation failed");
    }
  }
  return { examined: open.length, errors };
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
    if (!isSettledPayment(payment.status)) {
      throw conflict("REFUND_BEFORE_CAPTURE", "Capture not yet recorded; retry later.");
    }
    let [row] = await tx.select().from(refunds).where(eq(refunds.paypalRefundId, report.paypalRefundId));
    if (row && row.paymentAttemptId !== payment.id) {
      // PayPal refund ids are unique; one recorded against another payment means the event does
      // not describe this capture. Refuse rather than move money between payments.
      throw conflict("REFUND_PAYMENT_MISMATCH", "This refund is already recorded against a different payment.");
    }
    if (!row) {
      // Adopt an unresolved refund this payment is waiting on (same amount), so a refund whose
      // API response was lost is settled once instead of being counted twice.
      [row] = await tx
        .select()
        .from(refunds)
        .where(
          and(
            eq(refunds.paymentAttemptId, payment.id),
            inArray(refunds.status, ["REQUESTED", "UNKNOWN"]),
            eq(refunds.amountMinor, report.amountMinor),
            isNull(refunds.paypalRefundId),
          ),
        )
        .orderBy(asc(refunds.createdAt))
        .limit(1);
    }
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
          createdAt: now,
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
