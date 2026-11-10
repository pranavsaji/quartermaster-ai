import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Procurement request lifecycle. */
export const RequestStatus = {
  Draft: "DRAFT",
  Researching: "RESEARCHING",
  ReadyForReview: "READY_FOR_REVIEW",
  Blocked: "BLOCKED",
  Approved: "APPROVED",
  PaymentPending: "PAYMENT_PENDING",
  Paid: "PAID",
  Fulfilled: "FULFILLED",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
  Failed: "FAILED",
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus] | (string & {});

export const requestStatusSchema: EnumSchema<RequestStatus> = s.enumOf<RequestStatus>(RequestStatus);
