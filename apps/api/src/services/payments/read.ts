import type { PaymentDto } from "@qm/contracts";
import type { AppContext } from "../../context";
import { toPaymentDto } from "../orders";
import { reconcilePayment } from "./settle";
import { loadPayment, requirePayPal } from "./shared";

export async function getPayment(ctx: AppContext, organizationId: string, id: string): Promise<PaymentDto> {
  return toPaymentDto(await loadPayment(ctx.db, organizationId, id));
}

/**
 * Re-reads a payment's PayPal order and applies its state (for example, the buyer approved in a
 * PayPal window whose result the browser never received). Never captures: it can only move the
 * payment along what PayPal already reports.
 */
export async function syncPayment(ctx: AppContext, organizationId: string, id: string): Promise<PaymentDto> {
  requirePayPal(ctx);
  const payment = await loadPayment(ctx.db, organizationId, id); // tenant check
  if (payment.paypalOrderId) await reconcilePayment(ctx, payment.id);
  return toPaymentDto(await loadPayment(ctx.db, organizationId, id));
}
