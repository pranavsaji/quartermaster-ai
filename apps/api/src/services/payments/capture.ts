import { and, eq } from "drizzle-orm";
import { isSettledPayment, type PaymentDto, type PurchaseOrderDto } from "@qm/contracts";
import { budgetReservations, spendMandates } from "@qm/database";
import { PayPalApiError, toProviderOrderView, type PayPalOrder } from "@qm/payments";
import { guardCapture } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { AppError, badGateway, conflict, forbidden, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { loadCertificate, verifyStoredCertificate } from "../certificates";
import { DeferredFailure, withDeferredFailures, type Actor } from "../common";
import { recordFinding } from "../findings";
import { loadOrder, parseCertificatePayload } from "../orders";
import { evaluateOrder, recordDecision } from "../policy";
import { finalizeFromOrder, reconcilePayment } from "./settle";
import {
  failureMessageFor,
  isAmbiguousPayPalFailure,
  loadPayment,
  patchPayment,
  paymentResult,
  paypalFailureCode,
  requirePayPal,
  statusOf,
  transitionPayment,
} from "./shared";

/**
 * PayPal-Request-Id for a capture. Stable while the outcome is unknown (so retries are idempotent)
 * and new after a definitive rejection (so PayPal does not replay that rejection).
 */
export const captureRequestId = (paymentId: string, attempt: number) =>
  attempt === 0 ? `qm-capture-${paymentId}` : `qm-capture-${paymentId}-${attempt}`;

/** A capture is treated as in progress (not abandoned) for this long after it was authorised. */
const CAPTURE_IN_PROGRESS_MS = 60_000;
const BUYER_FIXABLE = new Set(["INSTRUMENT_DECLINED", "PAYER_ACTION_REQUIRED"]);

type CaptureResult = { payment: PaymentDto; purchase_order: PurchaseOrderDto };

/**
 * Captures an approved PayPal order. TrustRail's capture guard runs inside a locked transaction
 * immediately before the provider call; the payment is marked CAPTURE_PENDING first so a crash
 * or timeout is always reconciled against PayPal, never guessed.
 */
export async function capturePayment(ctx: AppContext, actor: Actor, paymentId: string, paypalOrderId: string): Promise<CaptureResult> {
  requirePayPal(ctx);
  const initial = await loadPayment(ctx.db, actor.organizationId, paymentId);
  if (initial.createdBy !== actor.id) throw forbidden("Only the owner who approved this purchase can complete the payment.");
  if (isSettledPayment(initial.status)) {
    if (initial.paypalOrderId !== paypalOrderId) throw conflict("ORDER_ID_MISMATCH", "PayPal order does not belong to this payment.");
    return paymentResult(ctx, actor.organizationId, initial.id);
  }

  // Authoritative provider state first: never trust the browser's claim of approval.
  let providerOrder: PayPalOrder;
  try {
    providerOrder = await ctx.paypal.getOrder(paypalOrderId);
  } catch (err) {
    ctx.log.warn({ err, payment_id: paymentId }, "could not read PayPal order before capture");
    throw badGateway("PAYPAL_UNREACHABLE", "Could not confirm the order with PayPal. Try again.");
  }
  if (providerOrder.status === "COMPLETED") {
    if (initial.paypalOrderId !== paypalOrderId) throw conflict("ORDER_ID_MISMATCH", "PayPal order does not belong to this payment.");
    await finalizeFromOrder(ctx, initial.id, providerOrder, "USER", actor.id);
    return paymentResult(ctx, actor.organizationId, initial.id);
  }

  const attempt = await authorizeCapture(ctx, actor, paymentId, paypalOrderId, providerOrder);

  let captured: PayPalOrder;
  try {
    captured = await ctx.paypal.captureOrder(paypalOrderId, captureRequestId(paymentId, attempt));
  } catch (err) {
    return handleCaptureError(ctx, actor, paymentId, err);
  }

  // From here on PayPal has captured the money. A local failure must never be reported (or
  // recorded) as a failed capture: leave the payment CAPTURE_PENDING for reconciliation.
  try {
    await finalizeFromOrder(ctx, paymentId, captured, "USER", actor.id);
  } catch (err) {
    ctx.log.error(
      { err, payment_id: paymentId, paypal_order_id: paypalOrderId },
      "PayPal captured the payment but recording it failed; left CAPTURE_PENDING for reconciliation",
    );
  }
  return paymentResult(ctx, actor.organizationId, paymentId);
}

/** Runs TrustRail's capture guard under locks and marks the payment CAPTURE_PENDING. */
async function authorizeCapture(
  ctx: AppContext,
  actor: Actor,
  paymentId: string,
  paypalOrderId: string,
  providerOrder: PayPalOrder,
): Promise<number> {
  return withDeferredFailures(ctx, () =>
    ctx.db.transaction(async (tx) => {
      const now = ctx.now();
      // Lock order: mandate (shared) → payment → certificate. A concurrent mandate update takes
      // the mandate FOR UPDATE first, so it either completes (and revokes) before this capture
      // is authorised, or waits until the capture is recorded as CAPTURE_PENDING.
      await tx
        .select({ id: spendMandates.id })
        .from(spendMandates)
        .where(and(eq(spendMandates.organizationId, actor.organizationId), eq(spendMandates.status, "ACTIVE")))
        .for("share");
      const payment = await loadPayment(tx, actor.organizationId, paymentId, true);
      if (payment.status === "CAPTURE_PENDING" && now.getTime() - payment.updatedAt.getTime() < CAPTURE_IN_PROGRESS_MS) {
        throw conflict("CAPTURE_IN_PROGRESS", "A capture for this payment is already in progress.");
      }
      const cert = await loadCertificate(tx, actor.organizationId, payment.intentId, true);
      const verification = await verifyStoredCertificate(tx, actor.organizationId, cert, now);
      const certificatePayload = parseCertificatePayload(cert.payload);
      if (!certificatePayload) {
        // A stored certificate that cannot be read never authorises money: refuse with evidence.
        throw new DeferredFailure(
          unprocessable("CAPTURE_REFUSED", "TrustRail refused to capture this payment.", { failures: [{ code: "CERTIFICATE_MALFORMED" }] }),
          async (db) => {
            await recordFinding(db, {
              organizationId: actor.organizationId,
              type: "CERTIFICATE_VERIFICATION_FAILED",
              severity: "CRITICAL",
              title: "Capture refused: stored certificate is malformed",
              description: "The Intent Certificate stored for this payment could not be read, so the capture was refused.",
              sourceKind: "payment_attempt",
              sourceId: payment.id,
              evidence: { intent_id: cert.id },
              relatedPurchaseOrderId: payment.purchaseOrderId,
            });
          },
        );
      }
      const { po, items } = await loadOrder(tx, actor.organizationId, payment.purchaseOrderId, true);
      const ev = await evaluateOrder(tx, actor.organizationId, po, items, {
        stage: "CAPTURE",
        now,
        excludeOwnReservationForIntent: cert.id,
        marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours,
      });
      const [reservation] = await tx.select().from(budgetReservations).where(eq(budgetReservations.intentId, cert.id));
      const guard = guardCapture({
        certificate: certificatePayload,
        verification,
        authenticated_user_id: actor.id,
        authenticated_org_id: actor.organizationId,
        payment: {
          id: payment.id,
          status: statusOf(payment),
          paypal_order_id: payment.paypalOrderId,
          amount_minor: payment.amountMinor,
          currency: payment.currency,
        },
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
        throw new DeferredFailure(
          unprocessable("CAPTURE_REFUSED", "TrustRail refused to capture this payment.", { failures: guard.failures }),
          async (db) => {
            // The decision recorded inside the refused transaction was rolled back; keep it as evidence.
            const decisionId = await recordDecision(db, actor.organizationId, ev);
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
            await appendAudit(db, {
              organizationId: actor.organizationId,
              action: "payment.capture_refused",
              actorType: "USER",
              actorId: actor.id,
              entityType: "payment_attempt",
              entityId: payment.id,
              data: { failures: guard.failures.map((f) => f.code), policy_decision_id: decisionId, input_digest: ev.result.input_digest },
            });
          },
        );
      }
      const patch = { payerId: providerOrder.payer?.payer_id ?? null };
      // A stale CAPTURE_PENDING (previous attempt abandoned) is re-armed rather than transitioned.
      if (payment.status === "CAPTURE_PENDING") await patchPayment(tx, payment.id, patch, now);
      else if (!(await transitionPayment(tx, payment, "CAPTURE_PENDING", patch, now))) {
        throw conflict("PAYMENT_NOT_CAPTURABLE", `Payment is ${payment.status}.`);
      }
      await appendAudit(tx, {
        organizationId: actor.organizationId,
        action: "payment.capture_authorized",
        actorType: "USER",
        actorId: actor.id,
        entityType: "payment_attempt",
        entityId: payment.id,
        data: { paypal_order_id: paypalOrderId, policy_decision_id: ev.decisionId },
      });
      return payment.captureAttempt;
    }),
  );
}

async function handleCaptureError(ctx: AppContext, actor: Actor, paymentId: string, err: unknown): Promise<CaptureResult> {
  const code = paypalFailureCode(err, "CAPTURE_ERROR");
  if (isAmbiguousPayPalFailure(err)) {
    // Outcome unknown (timeout, 5xx, malformed response, already captured): read the order
    // rather than assume. If PayPal is unreachable the payment stays CAPTURE_PENDING and the
    // sweeper reconciles it.
    ctx.log.warn({ err, payment_id: paymentId, code }, "capture outcome unknown; reconciling");
    await reconcilePayment(ctx, paymentId).catch((e: unknown) =>
      ctx.log.warn({ err: e, payment_id: paymentId }, "reconcile after capture failed"),
    );
    return paymentResult(ctx, actor.organizationId, paymentId);
  }
  // A definitive rejection from PayPal: nothing was captured, so the buyer may try again.
  ctx.log.info({ err, payment_id: paymentId, code }, "PayPal rejected the capture");
  await ctx.db.transaction(async (tx) => {
    const p = await loadPayment(tx, actor.organizationId, paymentId, true);
    await transitionPayment(
      tx,
      p,
      "ORDER_CREATED",
      // A new attempt gets a new PayPal-Request-Id: PayPal may replay a cached rejection otherwise.
      { failureCode: code, failureMessage: failureMessageFor(code), captureAttempt: p.captureAttempt + 1 },
      ctx.now(),
      "CAPTURE_REJECTED",
    );
  });
  if (err instanceof PayPalApiError && err.issue && BUYER_FIXABLE.has(err.issue)) {
    throw new AppError(422, err.issue, "PayPal declined the funding source. Choose another payment method and try again.", {
      restart: true,
    });
  }
  // A definitive PayPal rejection (nothing captured) that the buyer cannot fix by switching funding.
  throw unprocessable("PAYPAL_CAPTURE_REJECTED", "PayPal could not capture the payment. Nothing was charged; you can try again.", {
    paypal_issue: code,
    restart: true,
  });
}
