import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { paymentDtoSchema, type PaymentDto } from "./payment-dto.js";
import { purchaseOrderDtoSchema, type PurchaseOrderDto } from "./purchase-order-dto.js";

export type PaymentsCaptureResponse = {
  /** A PayPal payment attempt for a purchase order. */
  payment: PaymentDto;
  /** A proposed or committed purchase order (immutable once proposed). */
  purchaseOrder: PurchaseOrderDto;
};

export const paymentsCaptureResponseSchema: Schema<PaymentsCaptureResponse> =
  s.object<PaymentsCaptureResponse>({
    payment: paymentDtoSchema,
    purchaseOrder: purchaseOrderDtoSchema,
    _keysMap: {
      purchaseOrder: "purchase_order",
    },
  });
