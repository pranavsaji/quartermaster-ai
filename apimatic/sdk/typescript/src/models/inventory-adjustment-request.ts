import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { reasonSchema, type Reason } from "./reason.js";

/** An authorised stock change with a reason. */
export type InventoryAdjustmentRequest = {
  quantityDelta: number;
  /** Reason given by the person making the change. */
  reason: Reason;
  /** Optional note. */
  note?: string;
  expectedOnHand?: number;
};

export const inventoryAdjustmentRequestSchema: Schema<InventoryAdjustmentRequest> =
  s.object<InventoryAdjustmentRequest>({
    quantityDelta: s.int(),
    reason: reasonSchema,
    note: s.optional(s.string()),
    expectedOnHand: s.optional(s.int()),
    _keysMap: {
      quantityDelta: "quantity_delta",
      expectedOnHand: "expected_on_hand",
    },
  });
