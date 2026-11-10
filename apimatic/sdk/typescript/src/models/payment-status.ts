import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Payment attempt lifecycle. */
export const PaymentStatus = {
  Created: "CREATED",
  OrderCreated: "ORDER_CREATED",
  PayerApproved: "PAYER_APPROVED",
  CapturePending: "CAPTURE_PENDING",
  Completed: "COMPLETED",
  Failed: "FAILED",
  Voided: "VOIDED",
  Refunded: "REFUNDED",
  PartiallyRefunded: "PARTIALLY_REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus] | (string & {});

export const paymentStatusSchema: EnumSchema<PaymentStatus> = s.enumOf<PaymentStatus>(PaymentStatus);
