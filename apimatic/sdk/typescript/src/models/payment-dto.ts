import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { paymentStatusSchema, type PaymentStatus } from "./payment-status.js";

/** A PayPal payment attempt for a purchase order. */
export type PaymentDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Id of the related intent. */
  intentId: string;
  /** Id of the related purchase order. */
  purchaseOrderId: string;
  /** Payment attempt lifecycle. */
  status: PaymentStatus;
  /** PayPal Orders v2 order id. */
  paypalOrderId: string | null;
  /** PayPal capture id once payment completed. */
  paypalCaptureId: string | null;
  /** Amount, in minor units (cents). */
  amountMinor: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Captured amount, in minor units (cents). */
  capturedAmountMinor: number | null;
  /** Refunded amount, in minor units (cents). */
  refundedAmountMinor: number;
  failureCode: string | null;
  failureMessage: string | null;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
  /** When updated happened (ISO 8601, UTC). */
  updatedAt: string;
  /** When completed happened (ISO 8601, UTC). */
  completedAt: string | null;
};

export const paymentDtoSchema: Schema<PaymentDto> = s.object<PaymentDto>({
  id: s.string(),
  intentId: s.string(),
  purchaseOrderId: s.string(),
  status: paymentStatusSchema,
  paypalOrderId: s.nullable(s.string()),
  paypalCaptureId: s.nullable(s.string()),
  amountMinor: s.int(),
  currency: s.string(),
  capturedAmountMinor: s.nullable(s.int()),
  refundedAmountMinor: s.int(),
  failureCode: s.nullable(s.string()),
  failureMessage: s.nullable(s.string()),
  createdAt: s.string(),
  updatedAt: s.string(),
  completedAt: s.nullable(s.string()),
  _keysMap: {
    intentId: "intent_id",
    purchaseOrderId: "purchase_order_id",
    paypalOrderId: "paypal_order_id",
    paypalCaptureId: "paypal_capture_id",
    amountMinor: "amount_minor",
    capturedAmountMinor: "captured_amount_minor",
    refundedAmountMinor: "refunded_amount_minor",
    failureCode: "failure_code",
    failureMessage: "failure_message",
    createdAt: "created_at",
    updatedAt: "updated_at",
    completedAt: "completed_at",
  },
});
