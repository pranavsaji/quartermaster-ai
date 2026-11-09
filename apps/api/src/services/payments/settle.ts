import { and, eq, inArray } from "drizzle-orm";
import { PAYABLE_PO_STATUSES, minorToDecimalString, type PaymentStatus } from "@qm/contracts";
import { deliveries, intentCertificates, organizations, paymentAttempts, purchaseOrders, suppliers } from "@qm/database";
import { captureAmountMinor, extractCapture, type PayPalOrder } from "@qm/payments";
import { canTransition } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { conflict, notFound } from "../../errors";
import { appendAudit, type ActorType } from "../audit";
import { consumeReservation, localDate, recordUnreservedSpend, releaseReservation } from "../budget";
import { AfterCommit } from "../common";
import { recordFinding } from "../findings";
import { loadOrder } from "../orders";
import { refreshRequestStatus } from "../procurement/status";
import { loadPaymentForSystem, patchPayment, statusOf, transitionPayment } from "./shared";

/** Reads the PayPal order and applies its state. Safe to call any number of times. */
export async function reconcilePayment(ctx: AppContext, paymentId: string): Promise<PaymentStatus> {
  const p = await loadPaymentForSystem(ctx.db, paymentId);
  if (!p) return "FAILED";
  if (!p.paypalOrderId) return statusOf(p);
  const order = await ctx.paypal.getOrder(p.paypalOrderId);
  await ctx.db.update(paymentAttempts).set({ lastReconciledAt: ctx.now() }).where(eq(paymentAttempts.id, paymentId));
  if (order.status === "COMPLETED") return finalizeFromOrder(ctx, paymentId, order, "SYSTEM", null);
  if (order.status === "APPROVED" && p.status === "ORDER_CREATED") {
    const moved = await transitionPayment(ctx.db, p, "PAYER_APPROVED", {}, ctx.now());
    return moved ? "PAYER_APPROVED" : statusOf((await loadPaymentForSystem(ctx.db, paymentId))!);
  }
  if (order.status === "VOIDED")
    return applyTerminalFailure(ctx, paymentId, "VOIDED", "PAYPAL_ORDER_VOIDED", "PayPal voided the order.", "PAYPAL");
  return statusOf(p);
}

/**
 * Resolves a payment left in CAPTURE_PENDING whose capture never reached PayPal (timeout before
 * PayPal processed it, or a crash). Only acts once the certificate has expired and the attempt
 * is older than `staleMs`, and only when PayPal confirms no capture exists. A late capture is
 * still accounted for: VOIDED → COMPLETED is allowed and spend is recorded without a reservation.
 */
export async function voidAbandonedCapture(ctx: AppContext, paymentId: string, staleMs = 10 * 60_000): Promise<PaymentStatus> {
  const p = await loadPaymentForSystem(ctx.db, paymentId);
  if (!p?.paypalOrderId || p.status !== "CAPTURE_PENDING") return p ? statusOf(p) : "FAILED";
  const [cert] = await ctx.db.select().from(intentCertificates).where(eq(intentCertificates.id, p.intentId));
  const now = ctx.now();
  if (!cert || cert.expiresAt > now || now.getTime() - p.updatedAt.getTime() < staleMs) return "CAPTURE_PENDING";
  const order = await ctx.paypal.getOrder(p.paypalOrderId);
  await ctx.db.update(paymentAttempts).set({ lastReconciledAt: now }).where(eq(paymentAttempts.id, paymentId));
  if (order.status === "COMPLETED") return finalizeFromOrder(ctx, paymentId, order, "SYSTEM", null);
  if (extractCapture(order)) return "CAPTURE_PENDING"; // a capture exists (e.g. PENDING); wait for it
  return applyTerminalFailure(
    ctx,
    paymentId,
    "VOIDED",
    "CAPTURE_ABANDONED",
    "Capture never reached PayPal before the approval expired.",
    "SYSTEM",
  );
}

/**
 * Moves a payment to FAILED or VOIDED and unwinds everything it held: the budget reservation,
 * the certificate and the order's payable status.
 */
export async function applyTerminalFailure(
  ctx: AppContext,
  paymentId: string,
  status: "FAILED" | "VOIDED",
  code: string,
  message: string,
  actorType: ActorType,
): Promise<PaymentStatus> {
  return ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    const p = await loadPaymentForSystem(tx, paymentId, true);
    if (!p) return status;
    if (!(await transitionPayment(tx, p, status, { failureCode: code, failureMessage: message }, now))) return statusOf(p);
    await releaseReservation(tx, p.intentId, `PAYMENT_${status}`, now);
    await tx
      .update(intentCertificates)
      .set({ status: "REVOKED", revokedReason: `PAYMENT_${status}` })
      .where(and(eq(intentCertificates.id, p.intentId), eq(intentCertificates.status, "ACTIVE")));
    await tx
      .update(purchaseOrders)
      .set({ status: "CANCELLED", updatedAt: now })
      .where(and(eq(purchaseOrders.id, p.purchaseOrderId), inArray(purchaseOrders.status, [...PAYABLE_PO_STATUSES])));
    const [po] = await tx
      .select({ requestId: purchaseOrders.requestId })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, p.purchaseOrderId));
    if (po?.requestId) await refreshRequestStatus(tx, po.requestId, now);
    await appendAudit(tx, {
      organizationId: p.organizationId,
      action: `payment.${status.toLowerCase()}`,
      actorType,
      entityType: "payment_attempt",
      entityId: p.id,
      data: { code, message },
    });
    return status;
  });
}

/**
 * Applies a captured PayPal order to the system of record: payment COMPLETED, reservation
 * converted to spend, certificate consumed, order PAID and a synthetic delivery scheduled.
 * Idempotent and monotonic — duplicate or out-of-order calls never regress state.
 */
export async function finalizeFromOrder(
  ctx: AppContext,
  paymentId: string,
  order: PayPalOrder,
  actorType: ActorType,
  actorId: string | null,
): Promise<PaymentStatus> {
  const capture = extractCapture(order);
  if (!capture) {
    const p = await loadPaymentForSystem(ctx.db, paymentId);
    return p ? statusOf(p) : "FAILED";
  }
  if (capture.status === "DECLINED" || capture.status === "FAILED") {
    return applyTerminalFailure(
      ctx,
      paymentId,
      "FAILED",
      `CAPTURE_${capture.status}`,
      `PayPal reported the capture as ${capture.status.toLowerCase()}.`,
      "PAYPAL",
    );
  }

  const after = new AfterCommit();
  const status = await ctx.db.transaction(async (tx): Promise<PaymentStatus> => {
    const now = ctx.now();
    const p = await loadPaymentForSystem(tx, paymentId, true);
    if (!p) throw notFound("Payment");
    if (p.paypalOrderId !== order.id) throw conflict("ORDER_ID_MISMATCH", "PayPal order does not belong to this payment.");

    if (capture.status === "PENDING") {
      if (!(await transitionPayment(tx, p, "CAPTURE_PENDING", { paypalCaptureId: capture.id }, now)) && !p.paypalCaptureId) {
        await patchPayment(tx, p.id, { paypalCaptureId: capture.id }, now);
      }
      return "CAPTURE_PENDING";
    }
    if (!canTransition(statusOf(p), "COMPLETED")) return statusOf(p);

    const captured = captureAmountMinor(capture);
    const mismatch = captured !== p.amountMinor || capture.amount.currency_code !== p.currency;
    await transitionPayment(
      tx,
      p,
      "COMPLETED",
      {
        paypalCaptureId: capture.id,
        capturedAmountMinor: captured,
        payerId: order.payer?.payer_id ?? p.payerId,
        failureCode: mismatch ? "CAPTURED_AMOUNT_MISMATCH" : null,
        failureMessage: mismatch ? `Captured ${captured} ${capture.amount.currency_code}, approved ${p.amountMinor} ${p.currency}` : null,
        completedAt: now,
      },
      now,
    );
    if (!(await consumeReservation(tx, p.intentId, captured, now))) await recordUnreservedSpend(tx, p.intentId, captured, now);
    await tx.update(intentCertificates).set({ status: "CONSUMED", consumedAt: now }).where(eq(intentCertificates.id, p.intentId));

    const { po } = await loadOrder(tx, p.organizationId, p.purchaseOrderId, true);
    await tx.update(purchaseOrders).set({ status: "PAID", updatedAt: now }).where(eq(purchaseOrders.id, po.id));
    const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, po.supplierId));
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, p.organizationId));
    const today = localDate(now, org!.timezone).date;
    const expected = new Date(`${today}T00:00:00Z`);
    expected.setUTCDate(expected.getUTCDate() + (supplier?.leadTimeDays ?? 2));
    const expectedDate = expected.toISOString().slice(0, 10);
    await tx
      .insert(deliveries)
      .values({
        organizationId: p.organizationId,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        status: "SCHEDULED",
        expectedDate,
        originalExpectedDate: expectedDate,
      })
      .onConflictDoNothing({ target: deliveries.purchaseOrderId });
    if (po.requestId) await refreshRequestStatus(tx, po.requestId, now);

    await appendAudit(tx, {
      organizationId: p.organizationId,
      action: "payment.captured",
      actorType,
      actorId,
      entityType: "payment_attempt",
      entityId: p.id,
      data: {
        paypal_order_id: order.id,
        paypal_capture_id: capture.id,
        captured_minor: captured,
        approved_minor: p.amountMinor,
        intent_id: p.intentId,
      },
    });
    await appendAudit(tx, {
      organizationId: p.organizationId,
      action: "fulfillment.delivery_scheduled",
      actorType: "SYSTEM",
      entityType: "purchase_order",
      entityId: po.id,
      data: { expected_date: expectedDate, synthetic: true },
    });
    if (mismatch) {
      await recordFinding(tx, {
        organizationId: p.organizationId,
        type: "PAYMENT_AMOUNT_MISMATCH",
        severity: "CRITICAL",
        title: "Captured amount differs from the approved amount",
        description: `PayPal captured ${minorToDecimalString(captured, capture.amount.currency_code)} ${capture.amount.currency_code}; the owner approved ${minorToDecimalString(p.amountMinor, p.currency)} ${p.currency}.`,
        sourceKind: "payment_attempt",
        sourceId: p.id,
        evidence: { captured_minor: captured, approved_minor: p.amountMinor },
        relatedPurchaseOrderId: po.id,
      });
    }
    after.add(() =>
      ctx.notifier.send({
        kind: "PAYMENT_COMPLETED",
        organization_id: p.organizationId,
        title: `Payment completed for ${po.number}`,
        summary: `${supplier?.name ?? "Supplier"} · delivery expected ${expectedDate}`,
        amount_minor: captured,
        currency: p.currency,
        link_path: `/orders`,
      }),
    );
    return "COMPLETED";
  });
  after.flush(ctx);
  return status;
}
