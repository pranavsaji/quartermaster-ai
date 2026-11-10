import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Refund part or all of a captured payment. */
export type RefundRequest = {
  /** Amount, in minor units (cents). */
  amountMinor?: number;
  /** Reason given by the person making the change. */
  reason: string;
};

export const refundRequestSchema: Schema<RefundRequest> = s.object<RefundRequest>({
  amountMinor: s.optional(s.int()),
  reason: s.string(),
  _keysMap: {
    amountMinor: "amount_minor",
  },
});
