import { decimalStringToMinor, minorToDecimalString } from "@qm/contracts";
import type { Cart } from "@qm/trustrail";
import type { ProviderOrderView } from "@qm/trustrail";
import type { CreateOrderRequest, PayPalCapture, PayPalOrder } from "./types";

export interface OrderBinding {
  purchase_order_id: string;
  intent_id: string;
  purchase_order_number: string;
  supplier_name: string;
  brand_name: string;
}

/**
 * Converts the canonical, TrustRail-approved cart into a PayPal order body. Amounts come only
 * from the cart; the breakdown is constructed so PayPal itself rejects any inconsistency.
 */
export function buildCreateOrderRequest(cart: Cart, binding: OrderBinding): CreateOrderRequest {
  const c = cart.currency;
  const money = (minor: number) => ({ currency_code: c, value: minorToDecimalString(minor, c) });
  const items = cart.lines
    .filter((l) => l.kind === "PRODUCT")
    .map((l) => ({
      name: l.description.slice(0, 127),
      quantity: String(l.quantity),
      unit_amount: money(l.unit_price_minor),
      ...(l.sku ? { sku: l.sku.slice(0, 127) } : {}),
      category: "PHYSICAL_GOODS" as const,
    }));

  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: binding.purchase_order_id,
        custom_id: binding.intent_id,
        invoice_id: binding.purchase_order_number,
        description: `${binding.purchase_order_number} · ${binding.supplier_name}`.slice(0, 127),
        soft_descriptor: "QUARTERMASTER",
        amount: {
          ...money(cart.total_minor),
          breakdown: {
            item_total: money(cart.subtotal_minor),
            shipping: money(cart.shipping_minor),
            handling: money(cart.fees_minor),
            tax_total: money(cart.tax_minor),
          },
        },
        items,
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: binding.brand_name.slice(0, 127),
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      },
    },
  };
}

export function toProviderOrderView(order: PayPalOrder): ProviderOrderView {
  const unit = order.purchase_units?.[0];
  const currency = unit?.amount?.currency_code ?? "";
  let amount = -1;
  try {
    amount = unit?.amount ? decimalStringToMinor(unit.amount.value, currency) : -1;
  } catch {
    amount = -1;
  }
  return {
    id: order.id,
    status: order.status,
    currency,
    amount_minor: amount,
    reference_id: unit?.reference_id ?? null,
    custom_id: unit?.custom_id ?? null,
    invoice_id: unit?.invoice_id ?? null,
    payee_merchant_id: unit?.payee?.merchant_id ?? null,
  };
}

/** The capture on a captured order, if any. */
export function extractCapture(order: PayPalOrder): PayPalCapture | null {
  return order.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
}

export function captureAmountMinor(capture: PayPalCapture): number {
  return decimalStringToMinor(capture.amount.value, capture.amount.currency_code);
}
