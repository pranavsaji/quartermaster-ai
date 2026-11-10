import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Purchase order lifecycle. */
export const PurchaseOrderStatus = {
  Proposed: "PROPOSED",
  Blocked: "BLOCKED",
  Superseded: "SUPERSEDED",
  Approved: "APPROVED",
  PaymentPending: "PAYMENT_PENDING",
  Paid: "PAID",
  Fulfilled: "FULFILLED",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
  Expired: "EXPIRED",
} as const;
export type PurchaseOrderStatus =
  | (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus]
  | (string & {});

export const purchaseOrderStatusSchema: EnumSchema<PurchaseOrderStatus> =
  s.enumOf<PurchaseOrderStatus>(PurchaseOrderStatus);
