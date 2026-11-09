import { and, eq, sql } from "drizzle-orm";
import { minorToDecimalString, type PaymentDto, type PaymentStatus, type PurchaseOrderDto } from "@qm/contracts";
import {
  deliveries,
  intentCertificates,
  organizations,
  paymentAttempts,
  purchaseOrders,
  refunds,
  suppliers,
  type DbOrTx,
} from "@qm/database";
import {
  PayPalAmbiguousError,
  PayPalApiError,
  PayPalNotConfiguredError,
  buildCreateOrderRequest,
  captureAmountMinor,
  extractCapture,
  toProviderOrderView,
  type PayPalOrder,
} from "@qm/payments";
import { canTransition, guardCapture } from "@qm/trustrail";
import type { AppContext } from "../context";
import { AppError, badGateway, conflict, forbidden, notFound, unavailable, unprocessable } from "../errors";
import { appendAudit } from "./audit";
import { consumeReservation, localDate, recordUnreservedSpend, reduceSpend, releaseReservation } from "./budget";
import { loadCertificate, verifyStoredCertificate } from "./certificates";
import { recordFinding } from "./findings";
import { cartFromRows, loadOrder, orderDtos, toPaymentDto } from "./orders";
import { evaluateOrder } from "./policy";
import { DeferredFailure, withDeferredFailures, type Actor } from "./procurement/lifecycle";
import { refreshRequestStatus } from "./procurement/status";
import { budgetReservations } from "@qm/database";

export type PaymentRow = typeof paymentAttempts.$inferSelect;

function requirePayPal(ctx: AppContext) {
  if (!ctx.paypal.configured) throw unavailable("PAYPAL_NOT_CONFIGURED", "PayPal sandbox is not configured on this server.");
}

async function loadPayment(db: DbOrTx, organizationId: string, id: string, lock = false): Promise<PaymentRow> {
  const q = db.select().from(paymentAttempts).where(and(eq(paymentAttempts.id, id), eq(paymentAttempts.organizationId, organizationId)));
  const [row] = lock ? await q.for("update") : await q;
  if (!row) throw notFound("Payment");
  return row;
}

export async function getPayment(ctx: AppContext, organizationId: string, id: string): Promise<PaymentDto> {
  return toPaymentDto(await loadPayment(ctx.db, organizationId, id));
}

/* ======================================================================= Create order */

/**
 * Creates (or returns the existing) PayPal order for an approved intent. The order body is
 * derived from the persisted, certificate-bound cart; the request id is stable per logical
 * payment so retries can never create a second PayPal order.
 */
export async function createPayPalOrder(ctx: AppContext, actor: Actor, intentId: string): Promise<{ payment: PaymentDto; paypal_order_id: string }> {
  requirePayPal(ctx);
  const prepared = await withDeferredFailures(ctx, () =>
    ctx.db.transaction(async (tx) => {
      const now = ctx.now();
      const cert = await loadCertificate(tx, actor.organizationId, intentId, true);
      if (cert.buyerId !== actor.id) throw forbidden("Only the owner who approved this purchase can pay for it.");
      const [existing] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.intentId, cert.id)).for("update");
      if (existing?.paypalOrderId) return { attempt: existing, cart: null, po: null, supplierName: null };
      if (existing && !["CREATED"].includes(existing.status)) throw conflict("PAYMENT_NOT_CREATABLE", `Payment is ${existing.status}.`);

      const verification = await verifyStoredCertificate(tx, actor.organizationId, cert, now);
      if (!verification.valid) {
        throw new DeferredFailure(unprocessable("CERTIFICATE_INVALID", `Intent certificate is not valid: ${verification.status}.`, { checks: verification.checks }), (db) =>
          recordFinding(db, {
            organizationId: actor.organizationId,
            type: "CERTIFICATE_VERIFICATION_FAILED",
            severity: verification.status === "CART_MODIFIED" || verification.status === "SIGNATURE_INVALID" ? "CRITICAL" : "MEDIUM",
            title: `Payment refused: certificate ${verification.status}`,
            description: "A PayPal order was requested for an intent whose certificate did not verify.",
            sourceKind: "intent_certificate",
            sourceId: cert.id,
            evidence: { checks: verification.checks },
            relatedPurchaseOrderId: cert.purchaseOrderId,
          }).then(() => undefined),
        );
      }
      const { po, items } = await loadOrder(tx, actor.organizationId, cert.purchaseOrderId, true);
      if (!["APPROVED", "PAYMENT_PENDING"].includes(po.status)) throw conflict("ORDER_NOT_PAYABLE", `Purchase order is ${po.status}.`);
      const [supplier] = await tx.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, po.supplierId));
      const attempt =
        existing ??
        (
          await tx
            .insert(paymentAttempts)
            .values({ organizationId: actor.organizationId, intentId: cert.id, purchaseOrderId: po.id, status: "CREATED", amountMinor: po.totalMinor, currency: po.currency, createdBy: actor.id })
            .returning()
        )[0]!;
      return { attempt, cart: cartFromRows(po, items), po, supplierName: supplier?.name ?? "Supplier" };
    }),
  );

  if (prepared.attempt.paypalOrderId) return { payment: toPaymentDto(prepared.attempt), paypal_order_id: prepared.attempt.paypalOrderId };

  let order: PayPalOrder;
  try {
    order = await ctx.paypal.createOrder(
      buildCreateOrderRequest(prepared.cart!, {
        purchase_order_id: prepared.po!.id,
        intent_id: intentId,
        purchase_order_number: prepared.po!.number,
        supplier_name: prepared.supplierName!,
        brand_name: ctx.config.paypal.brandName,
      }),
      `qm-create-${prepared.attempt.id}`,
    );
  } catch (err) {
    await ctx.db
      .update(paymentAttempts)
      .set({ failureCode: err instanceof PayPalApiError ? (err.issue ?? `HTTP_${err.status}`) : "PAYPAL_UNREACHABLE", failureMessage: (err as Error).message.slice(0, 500), updatedAt: ctx.now() })
      .where(eq(paymentAttempts.id, prepared.attempt.id));
    if (err instanceof PayPalNotConfiguredError) throw unavailable("PAYPAL_NOT_CONFIGURED", err.message);
    // An ambiguous outcome is safe to retry: the same PayPal-Request-Id returns the same order.
    throw badGateway("PAYPAL_ORDER_FAILED", "PayPal did not create the order. Try again.", { retryable: err instanceof PayPalAmbiguousError || (err instanceof PayPalApiError && err.retryable) });
  }

  const view = toProviderOrderView(order);
  if (view.amount_minor !== prepared.attempt.amountMinor || view.custom_id !== intentId) {
    throw badGateway("PAYPAL_ORDER_MISMATCH", "PayPal returned an order that does not match the approved intent.");
  }
  const updated = await ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .update(paymentAttempts)
      .set({ status: "ORDER_CREATED", paypalOrderId: order.id, failureCode: null, failureMessage: null, updatedAt: ctx.now() })
      .where(and(eq(paymentAttempts.id, prepared.attempt.id), eq(paymentAttempts.status, "CREATED")))
      .returning();
    await tx.update(purchaseOrders).set({ status: "PAYMENT_PENDING", updatedAt: ctx.now() }).where(and(eq(purchaseOrders.id, prepared.po!.id), eq(purchaseOrders.status, "APPROVED")));
    if (prepared.po!.requestId) await refreshRequestStatus(tx, prepared.po!.requestId, ctx.now());
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "payment.order_created",
      actorType: "USER",
      actorId: actor.id,
      entityType: "payment_attempt",
      entityId: prepared.attempt.id,
      data: { paypal_order_id: order.id, amount_minor: prepared.attempt.amountMinor, intent_id: intentId },
    });
    return row ?? (await loadPayment(tx, actor.organizationId, prepared.attempt.id));
  });
  return { payment: toPaymentDto(updated), paypal_order_id: order.id };
}

/* ============================================================================ Capture */

export async function capturePayment(
  ctx: AppContext,
  actor: Actor,
  paymentId: string,
  paypalOrderId: string,
): Promise<{ payment: PaymentDto; purchase_order: PurchaseOrderDto }> {
  requirePayPal(ctx);
  const initial = await loadPayment(ctx.db, actor.organizationId, paymentId);
  if (initial.createdBy !== actor.id) throw forbidden("Only the owner who approved this purchase can complete the payment.");
  if (initial.status === "COMPLETED" || initial.status === "PARTIALLY_REFUNDED" || initial.status === "REFUNDED") {
    if (initial.paypalOrderId !== paypalOrderId) throw conflict("ORDER_ID_MISMATCH", "PayPal order does not belong to this payment.");
    return result(ctx, actor.organizationId, initial.id);
  }

  // Authoritative provider state first: never trust the browser's claim of approval.
  let providerOrder: PayPalOrder;
  try {
    providerOrder = await ctx.paypal.getOrder(paypalOrderId);
  } catch (err) {
    throw badGateway("PAYPAL_UNREACHABLE", "Could not confirm the order with PayPal. Try again.", { cause: (err as Error).message });
  }
  if (providerOrder.status === "COMPLETED") {
    await finalizeFromOrder(ctx, initial.id, providerOrder, "USER", actor.id);
    return result(ctx, actor.organizationId, initial.id);
  }

  await withDeferredFailures(ctx, () =>
    ctx.db.transaction(async (tx) => {
      const now = ctx.now();
      const payment = await loadPayment(tx, actor.organizationId, paymentId, true);
      if (payment.status === "CAPTURE_PENDING" && now.getTime() - payment.updatedAt.getTime() < 60_000) {
        throw conflict("CAPTURE_IN_PROGRESS", "A capture for this payment is already in progress.");
      }
      const cert = await loadCertificate(tx, actor.organizationId, payment.intentId, true);
      const verification = await verifyStoredCertificate(tx, actor.organizationId, cert, now);
      const { po, items } = await loadOrder(tx, actor.organizationId, payment.purchaseOrderId, true);
      const ev = await evaluateOrder(tx, actor.organizationId, po, items, {
        stage: "CAPTURE",
        now,
        excludeOwnReservationForIntent: cert.id,
        marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours,
      });
      const [reservation] = await tx.select().from(budgetReservations).where(eq(budgetReservations.intentId, cert.id));
      const guard = guardCapture({
        certificate: cert.payload as never,
        verification,
        authenticated_user_id: actor.id,
        authenticated_org_id: actor.organizationId,
        payment: { id: payment.id, status: payment.status as PaymentStatus, paypal_order_id: payment.paypalOrderId, amount_minor: payment.amountMinor, currency: payment.currency },
        requested_paypal_order_id: paypalOrderId,
        provider_order: toProviderOrderView(providerOrder),
        reservation: reservation ? { status: reservation.status, amount_minor: reservation.amountMinor } : null,
        expected_payee_merchant_id: ctx.config.paypal.merchantId,
        // Budget is already reserved for this intent; only BLOCK-level changes (e.g. the supplier
        // was removed from the mandate) stop the capture.
        policy_still_allows: ev.result.decision !== "BLOCK",
      });
      if (!guard.allowed) {
        const amountProblem = guard.failures.some((f) => f.code === "AMOUNT_MISMATCH" || f.code === "PAYEE_MISMATCH");
        throw new DeferredFailure(unprocessable("CAPTURE_REFUSED", "TrustRail refused to capture this payment.", { failures: guard.failures }), async (db) => {
          await recordFinding(db, {
            organizationId: actor.organizationId,
            type: amountProblem ? "PAYMENT_AMOUNT_MISMATCH" : "CERTIFICATE_VERIFICATION_FAILED",
            severity: amountProblem ? "CRITICAL" : "HIGH",
            title: "Capture refused by TrustRail",
            description: guard.failures.map((f) => f.detail).join(" "),
            sourceKind: "payment_attempt",
            sourceId: payment.id,
            evidence: { failures: guard.failures, paypal_order_id: paypalOrderId },
            relatedPurchaseOrderId: payment.purchaseOrderId,
          });
          await appendAudit(db, { organizationId: actor.organizationId, action: "payment.capture_refused", actorType: "USER", actorId: actor.id, entityType: "payment_attempt", entityId: payment.id, data: { failures: guard.failures.map((f) => f.code) } });
        });
      }
      await tx
        .update(paymentAttempts)
        .set({ status: "CAPTURE_PENDING", payerId: providerOrder.payer?.payer_id ?? null, updatedAt: now })
        .where(eq(paymentAttempts.id, payment.id));
      await appendAudit(tx, { organizationId: actor.organizationId, action: "payment.capture_authorized", actorType: "USER", actorId: actor.id, entityType: "payment_attempt", entityId: payment.id, data: { paypal_order_id: paypalOrderId, policy_decision_id: ev.decisionId } });
    }),
  );

  try {
    const captured = await ctx.paypal.captureOrder(paypalOrderId, `qm-capture-${paymentId}`);
    await finalizeFromOrder(ctx, paymentId, captured, "USER", actor.id);
  } catch (err) {
    if (err instanceof PayPalAmbiguousError) {
      // Outcome unknown: reconcile by reading the order rather than assuming failure.
      await reconcilePayment(ctx, paymentId);
    } else if (err instanceof PayPalApiError && err.issue === "ORDER_ALREADY_CAPTURED") {
      await reconcilePayment(ctx, paymentId);
    } else if (err instanceof PayPalApiError && (err.issue === "INSTRUMENT_DECLINED" || err.issue === "PAYER_ACTION_REQUIRED")) {
      await ctx.db.update(paymentAttempts).set({ status: "ORDER_CREATED", failureCode: err.issue, failureMessage: err.message.slice(0, 500), updatedAt: ctx.now() }).where(eq(paymentAttempts.id, paymentId));
      throw new AppError(422, err.issue, "PayPal declined the funding source. Choose another payment method and try again.", { restart: true });
    } else {
      const code = err instanceof PayPalApiError ? (err.issue ?? `HTTP_${err.status}`) : "CAPTURE_ERROR";
      await ctx.db.update(paymentAttempts).set({ status: "ORDER_CREATED", failureCode: code, failureMessage: (err as Error).message.slice(0, 500), updatedAt: ctx.now() }).where(eq(paymentAttempts.id, paymentId));
      throw badGateway("PAYPAL_CAPTURE_FAILED", "PayPal could not capture the payment.", { code });
    }
  }
  return result(ctx, actor.organizationId, paymentId);
}

async function result(ctx: AppContext, organizationId: string, paymentId: string) {
  const payment = await loadPayment(ctx.db, organizationId, paymentId);
  const [po] = await ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, payment.purchaseOrderId));
  const [dto] = await orderDtos(ctx.db, organizationId, [po!]);
  return { payment: toPaymentDto(payment), purchase_order: dto! };
}

/** Reads the PayPal order and applies its state. Safe to call any number of times. */
export async function reconcilePayment(ctx: AppContext, paymentId: string): Promise<PaymentStatus> {
  const [p] = await ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.id, paymentId));
  if (!p?.paypalOrderId) return (p?.status as PaymentStatus) ?? "FAILED";
  const order = await ctx.paypal.getOrder(p.paypalOrderId);
  await ctx.db.update(paymentAttempts).set({ lastReconciledAt: ctx.now() }).where(eq(paymentAttempts.id, paymentId));
  if (order.status === "COMPLETED") return finalizeFromOrder(ctx, paymentId, order, "SYSTEM", null);
  if (order.status === "APPROVED" && p.status === "ORDER_CREATED") {
    await ctx.db.update(paymentAttempts).set({ status: "PAYER_APPROVED", updatedAt: ctx.now() }).where(and(eq(paymentAttempts.id, paymentId), eq(paymentAttempts.status, "ORDER_CREATED")));
    return "PAYER_APPROVED";
  }
  if (order.status === "VOIDED") return applyTerminalFailure(ctx, paymentId, "VOIDED", "PayPal voided the order.");
  return p.status as PaymentStatus;
}

async function applyTerminalFailure(ctx: AppContext, paymentId: string, status: "FAILED" | "VOIDED", message: string): Promise<PaymentStatus> {
  return ctx.db.transaction(async (tx) => {
    const [p] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, paymentId)).for("update");
    if (!p || !canTransition(p.status as PaymentStatus, status)) return (p?.status as PaymentStatus) ?? status;
    await tx.update(paymentAttempts).set({ status, failureMessage: message, updatedAt: ctx.now() }).where(eq(paymentAttempts.id, p.id));
    await releaseReservation(tx, p.intentId, `PAYMENT_${status}`, ctx.now());
    await tx.update(intentCertificates).set({ status: "REVOKED", revokedReason: `PAYMENT_${status}` }).where(and(eq(intentCertificates.id, p.intentId), eq(intentCertificates.status, "ACTIVE")));
    await tx.update(purchaseOrders).set({ status: "CANCELLED", updatedAt: ctx.now() }).where(and(eq(purchaseOrders.id, p.purchaseOrderId), sql`${purchaseOrders.status} in ('APPROVED','PAYMENT_PENDING')`));
    const [po] = await tx.select({ requestId: purchaseOrders.requestId }).from(purchaseOrders).where(eq(purchaseOrders.id, p.purchaseOrderId));
    if (po?.requestId) await refreshRequestStatus(tx, po.requestId, ctx.now());
    await appendAudit(tx, { organizationId: p.organizationId, action: `payment.${status.toLowerCase()}`, actorType: "PAYPAL", entityType: "payment_attempt", entityId: p.id, data: { message } });
    return status;
  });
}

/**
 * Applies a captured PayPal order to the system of record: payment COMPLETED, reservation
 * converted to spend, certificate consumed, order PAID and a synthetic delivery scheduled.
 * Idempotent and monotonic — duplicate or out-of-order calls never regress state.
 */
export async function finalizeFromOrder(ctx: AppContext, paymentId: string, order: PayPalOrder, actorType: "USER" | "SYSTEM" | "PAYPAL", actorId: string | null): Promise<PaymentStatus> {
  const capture = extractCapture(order);
  if (!capture) return (await ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.id, paymentId)))[0]?.status as PaymentStatus;
  if (capture.status === "DECLINED" || capture.status === "FAILED") return applyTerminalFailure(ctx, paymentId, "FAILED", `Capture ${capture.status.toLowerCase()}`);

  return ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    const [p] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, paymentId)).for("update");
    if (!p) throw notFound("Payment");
    if (p.paypalOrderId !== order.id) throw conflict("ORDER_ID_MISMATCH", "PayPal order does not belong to this payment.");

    if (capture.status === "PENDING") {
      if (canTransition(p.status as PaymentStatus, "CAPTURE_PENDING")) {
        await tx.update(paymentAttempts).set({ status: "CAPTURE_PENDING", paypalCaptureId: capture.id, updatedAt: now }).where(eq(paymentAttempts.id, p.id));
      } else if (!p.paypalCaptureId) {
        await tx.update(paymentAttempts).set({ paypalCaptureId: capture.id, updatedAt: now }).where(eq(paymentAttempts.id, p.id));
      }
      return "CAPTURE_PENDING" as PaymentStatus;
    }
    if (!canTransition(p.status as PaymentStatus, "COMPLETED")) return p.status as PaymentStatus;

    const captured = captureAmountMinor(capture);
    const mismatch = captured !== p.amountMinor || capture.amount.currency_code !== p.currency;
    await tx
      .update(paymentAttempts)
      .set({
        status: "COMPLETED",
        paypalCaptureId: capture.id,
        capturedAmountMinor: captured,
        payerId: order.payer?.payer_id ?? p.payerId,
        failureCode: mismatch ? "CAPTURED_AMOUNT_MISMATCH" : null,
        failureMessage: mismatch ? `Captured ${captured} ${capture.amount.currency_code}, approved ${p.amountMinor} ${p.currency}` : null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(paymentAttempts.id, p.id));
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
      .values({ organizationId: p.organizationId, purchaseOrderId: po.id, supplierId: po.supplierId, status: "SCHEDULED", expectedDate, originalExpectedDate: expectedDate })
      .onConflictDoNothing({ target: deliveries.purchaseOrderId });
    if (po.requestId) await refreshRequestStatus(tx, po.requestId, now);

    await appendAudit(tx, {
      organizationId: p.organizationId,
      action: "payment.captured",
      actorType,
      actorId,
      entityType: "payment_attempt",
      entityId: p.id,
      data: { paypal_order_id: order.id, paypal_capture_id: capture.id, captured_minor: captured, approved_minor: p.amountMinor, intent_id: p.intentId },
    });
    await appendAudit(tx, { organizationId: p.organizationId, action: "fulfillment.delivery_scheduled", actorType: "SYSTEM", entityType: "purchase_order", entityId: po.id, data: { expected_date: expectedDate, synthetic: true } });
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
    void ctx.notifier.send({ kind: "PAYMENT_COMPLETED", organization_id: p.organizationId, title: `Payment completed for ${po.number}`, summary: `${supplier?.name ?? "Supplier"} · delivery expected ${expectedDate}`, amount_minor: captured, currency: p.currency, link_path: `/orders` });
    return "COMPLETED" as PaymentStatus;
  });
}

/* ============================================================================= Refund */

export async function refundPayment(ctx: AppContext, actor: Actor, paymentId: string, amountMinor: number | undefined, reason: string): Promise<PaymentDto> {
  requirePayPal(ctx);
  const refundRow = await ctx.db.transaction(async (tx) => {
    const p = await loadPayment(tx, actor.organizationId, paymentId, true);
    if (!["COMPLETED", "PARTIALLY_REFUNDED"].includes(p.status) || !p.paypalCaptureId || p.capturedAmountMinor === null) {
      throw conflict("NOT_REFUNDABLE", `Payment is ${p.status}.`);
    }
    const refundable = p.capturedAmountMinor - p.refundedAmountMinor;
    const amount = amountMinor ?? refundable;
    if (amount <= 0 || amount > refundable) throw unprocessable("REFUND_AMOUNT_INVALID", `Refund must be between 1 and ${refundable}.`);
    const [r] = await tx.insert(refunds).values({ organizationId: actor.organizationId, paymentAttemptId: p.id, amountMinor: amount, status: "PENDING", reason, createdBy: actor.id }).returning();
    return { refund: r!, payment: p, amount };
  });

  let refund;
  try {
    refund = await ctx.paypal.refundCapture(
      refundRow.payment.paypalCaptureId!,
      `qm-refund-${refundRow.refund.id}`,
      { currency_code: refundRow.payment.currency, value: minorToDecimalString(refundRow.amount, refundRow.payment.currency) },
      reason,
    );
  } catch (err) {
    await ctx.db.update(refunds).set({ status: err instanceof PayPalAmbiguousError ? "UNKNOWN" : "FAILED" }).where(eq(refunds.id, refundRow.refund.id));
    throw badGateway("PAYPAL_REFUND_FAILED", "PayPal did not complete the refund.", { message: (err as Error).message });
  }

  return ctx.db.transaction(async (tx) => {
    const p = await loadPayment(tx, actor.organizationId, paymentId, true);
    await tx.update(refunds).set({ status: refund.status, paypalRefundId: refund.id }).where(eq(refunds.id, refundRow.refund.id));
    if (refund.status === "COMPLETED" || refund.status === "PENDING") {
      const refunded = p.refundedAmountMinor + refundRow.amount;
      const status: PaymentStatus = refunded >= (p.capturedAmountMinor ?? 0) ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await tx.update(paymentAttempts).set({ refundedAmountMinor: refunded, status: canTransition(p.status as PaymentStatus, status) ? status : (p.status as PaymentStatus), updatedAt: ctx.now() }).where(eq(paymentAttempts.id, p.id));
      await reduceSpend(tx, p.intentId, refundRow.amount, ctx.now());
    }
    await appendAudit(tx, { organizationId: actor.organizationId, action: "payment.refunded", actorType: "USER", actorId: actor.id, entityType: "payment_attempt", entityId: p.id, data: { amount_minor: refundRow.amount, paypal_refund_id: refund.id, status: refund.status, reason } });
    return toPaymentDto(await loadPayment(tx, actor.organizationId, paymentId));
  });
}
