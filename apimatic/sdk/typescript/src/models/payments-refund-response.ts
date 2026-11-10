import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { paymentDtoSchema, type PaymentDto } from "./payment-dto.js";

export type PaymentsRefundResponse = {
  /** A PayPal payment attempt for a purchase order. */
  payment: PaymentDto;
};

export const paymentsRefundResponseSchema: Schema<PaymentsRefundResponse> = s.object<PaymentsRefundResponse>({
  payment: paymentDtoSchema,
});
