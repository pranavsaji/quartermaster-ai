import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** The owner's approval of one exact proposal, bound to the cart hash they saw. */
export type ApproveRequest = {
  /** Id of the related purchase order. */
  purchaseOrderId: string;
  /** SHA-256 of the canonical cart, bound into the Intent Certificate. */
  cartHash: string;
  acknowledgedReviewCodes?: string[];
  /** Optional note. */
  note?: string;
};

export const approveRequestSchema: Schema<ApproveRequest> = s.object<ApproveRequest>({
  purchaseOrderId: s.string(),
  cartHash: s.string(),
  acknowledgedReviewCodes: s.optional(s.array(s.string())),
  note: s.optional(s.string()),
  _keysMap: {
    purchaseOrderId: "purchase_order_id",
    cartHash: "cart_hash",
    acknowledgedReviewCodes: "acknowledged_review_codes",
  },
});
