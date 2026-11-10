import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { paymentDtoSchema, type PaymentDto } from "./payment-dto.js";

/** `POST /intents/:id/paypal-order`. */
export type PayPalOrderResponse = {
  /** A PayPal payment attempt for a purchase order. */
  payment: PaymentDto;
  /** PayPal Orders v2 order id. */
  paypalOrderId: string;
};

export const payPalOrderResponseSchema: Schema<PayPalOrderResponse> = s.object<PayPalOrderResponse>({
  payment: paymentDtoSchema,
  paypalOrderId: s.string(),
  _keysMap: {
    paypalOrderId: "paypal_order_id",
  },
});
