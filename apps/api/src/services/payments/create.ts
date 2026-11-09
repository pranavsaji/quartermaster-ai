import { and, eq } from "drizzle-orm";
import { PAYABLE_PO_STATUSES, type PaymentDto } from "@qm/contracts";
import { paymentAttempts, purchaseOrders, suppliers } from "@qm/database";
import { PayPalNotConfiguredError, buildCreateOrderRequest, toProviderOrderView, type PayPalOrder } from "@qm/payments";
import type { AppContext } from "../../context";
import { badGateway, conflict, forbidden, unavailable, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { loadCertificate, verifyStoredCertificate } from "../certificates";
import { DeferredFailure, retryOnConflict, withDeferredFailures, type Actor } from "../common";
import { recordFinding } from "../findings";
import { cartFromRows, loadOrder, toPaymentDto } from "../orders";
import { refreshRequestStatus } from "../procurement/status";
import { applyTerminalFailure } from "./settle";
import {
  failureMessageFor,
  isAmbiguousPayPalFailure,
  loadPayment,
  patchPayment,
  paypalFailureCode,
  requirePayPal,
  transitionPayment,
} from "./shared";

/**
 * Creates (or returns the existing) PayPal order for an approved intent. The order body is
 * derived from the persisted, certificate-bound cart; the request id is stable per logical
 * payment so retries can never create a second PayPal order.
 */
export async function createPayPalOrder(
  ctx: AppContext,
  actor: Actor,
  intentId: string,
): Promise<{ payment: PaymentDto; paypal_order_id: string }> {
  requirePayPal(ctx);
  const prepared = await withDeferredFailures(ctx, () =>
    retryOnConflict(ctx, "payment.create_order", () =>
      ctx.db.transaction(async (tx) => {
        const now = ctx.now();
        // Lock order everywhere: payment, then certificate. Read the certificate first (tenant
        // check), lock an existing payment, then the certificate. With no payment yet, the
        // certificate lock serialises creators, so the payment is re-read after taking it.
        const visible = await loadCertificate(tx, actor.organizationId, intentId);
        if (visible.buyerId !== actor.id) throw forbidden("Only the owner who approved this purchase can pay for it.");
        const lockPayment = () => tx.select().from(paymentAttempts).where(eq(paymentAttempts.intentId, visible.id)).for("update");
        let [existing] = await lockPayment();
        const cert = await loadCertificate(tx, actor.organizationId, intentId, true);
        if (!existing) [existing] = await lockPayment();
        if (existing && (existing.status === "VOIDED" || existing.status === "FAILED"))
          throw conflict("PAYMENT_NOT_CREATABLE", `Payment is ${existing.status}.`);
        if (existing?.paypalOrderId) return { attempt: existing, cart: null, po: null, supplierName: null };
        if (existing && existing.status !== "CREATED") throw conflict("PAYMENT_NOT_CREATABLE", `Payment is ${existing.status}.`);

        const verification = await verifyStoredCertificate(tx, actor.organizationId, cert, now);
        if (!verification.valid) {
          throw new DeferredFailure(
            unprocessable("CERTIFICATE_INVALID", `Intent certificate is not valid: ${verification.status}.`, {
              checks: verification.checks,
            }),
            (db) =>
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
        if (!(PAYABLE_PO_STATUSES as readonly string[]).includes(po.status))
          throw conflict("ORDER_NOT_PAYABLE", `Purchase order is ${po.status}.`);
        const [supplier] = await tx.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, po.supplierId));
        const attempt =
          existing ??
          (
            await tx
              .insert(paymentAttempts)
              .values({
                organizationId: actor.organizationId,
                intentId: cert.id,
                purchaseOrderId: po.id,
                status: "CREATED",
                amountMinor: po.totalMinor,
                currency: po.currency,
                createdBy: actor.id,
              })
              .returning()
          )[0]!;
        return { attempt, cart: cartFromRows(po, items), po, supplierName: supplier?.name ?? "Supplier" };
      }),
    ),
  );

  if (prepared.attempt.paypalOrderId) return { payment: toPaymentDto(prepared.attempt), paypal_order_id: prepared.attempt.paypalOrderId };
  const po = prepared.po!;

  let order: PayPalOrder;
  try {
    order = await ctx.paypal.createOrder(
      buildCreateOrderRequest(prepared.cart!, {
        purchase_order_id: po.id,
        intent_id: intentId,
        purchase_order_number: po.number,
        supplier_name: prepared.supplierName!,
        brand_name: ctx.config.paypal.brandName,
      }),
      `qm-create-${prepared.attempt.id}`,
    );
  } catch (err) {
    const code = paypalFailureCode(err, "ORDER_CREATE_ERROR");
    ctx.log.warn({ err, payment_id: prepared.attempt.id, code }, "PayPal order creation failed");
    await patchPayment(ctx.db, prepared.attempt.id, { failureCode: code, failureMessage: failureMessageFor(code) }, ctx.now());
    if (err instanceof PayPalNotConfiguredError) throw unavailable("PAYPAL_NOT_CONFIGURED", "PayPal is not configured on this server.");
    // An ambiguous outcome is safe to retry: the same PayPal-Request-Id returns the same order.
    throw badGateway("PAYPAL_ORDER_FAILED", "PayPal did not create the order. Try again.", {
      retryable: isAmbiguousPayPalFailure(err),
    });
  }

  const view = toProviderOrderView(order);
  if (view.amount_minor !== prepared.attempt.amountMinor || view.custom_id !== intentId) {
    // The order exists at PayPal but does not match what the owner approved. Never let it be
    // paid: void the attempt and record evidence. Retrying would return the same order.
    await ctx.db.transaction(async (tx) => {
      await patchPayment(tx, prepared.attempt.id, { paypalOrderId: order.id }, ctx.now());
      await recordFinding(tx, {
        organizationId: actor.organizationId,
        type: "PAYMENT_AMOUNT_MISMATCH",
        severity: "CRITICAL",
        title: "PayPal order does not match the approved intent",
        description: `PayPal order ${order.id} reported ${view.amount_minor} minor units for intent ${view.custom_id ?? "unknown"}; the owner approved ${prepared.attempt.amountMinor} for ${intentId}.`,
        sourceKind: "payment_attempt",
        sourceId: prepared.attempt.id,
        evidence: {
          paypal_order_id: order.id,
          provider_amount_minor: view.amount_minor,
          approved_minor: prepared.attempt.amountMinor,
          provider_custom_id: view.custom_id,
        },
        relatedPurchaseOrderId: po.id,
      });
    });
    // Unwind the approval: void the attempt, release the budget and revoke the certificate.
    await applyTerminalFailure(
      ctx,
      prepared.attempt.id,
      "VOIDED",
      "PAYPAL_ORDER_MISMATCH",
      "PayPal returned an order that does not match the approved intent.",
      "PAYPAL",
    );
    throw badGateway("PAYPAL_ORDER_MISMATCH", "PayPal returned an order that does not match the approved intent. The payment was voided.");
  }

  const updated = await ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    const attempt = await loadPayment(tx, actor.organizationId, prepared.attempt.id, true);
    await transitionPayment(tx, attempt, "ORDER_CREATED", { paypalOrderId: order.id, failureCode: null, failureMessage: null }, now);
    await tx
      .update(purchaseOrders)
      .set({ status: "PAYMENT_PENDING", updatedAt: now })
      .where(and(eq(purchaseOrders.id, po.id), eq(purchaseOrders.status, "APPROVED")));
    if (po.requestId) await refreshRequestStatus(tx, po.requestId, now);
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "payment.order_created",
      actorType: "USER",
      actorId: actor.id,
      entityType: "payment_attempt",
      entityId: prepared.attempt.id,
      data: { paypal_order_id: order.id, amount_minor: prepared.attempt.amountMinor, intent_id: intentId },
    });
    return loadPayment(tx, actor.organizationId, prepared.attempt.id);
  });
  return { payment: toPaymentDto(updated), paypal_order_id: updated.paypalOrderId ?? order.id };
}
