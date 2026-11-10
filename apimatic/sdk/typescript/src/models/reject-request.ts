import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Reject one proposal, or every open proposal on the request. */
export type RejectRequest = {
  /** Reason given by the person making the change. */
  reason: string;
  /** Id of the related purchase order. */
  purchaseOrderId?: string;
};

export const rejectRequestSchema: Schema<RejectRequest> = s.object<RejectRequest>({
  reason: s.string(),
  purchaseOrderId: s.optional(s.string()),
  _keysMap: {
    purchaseOrderId: "purchase_order_id",
  },
});
