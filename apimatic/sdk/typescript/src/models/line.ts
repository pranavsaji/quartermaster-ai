import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Line = {
  /** Id of the related purchase order item. */
  purchaseOrderItemId: string;
  quantityReceived: number;
};

export const lineSchema: Schema<Line> = s.object<Line>({
  purchaseOrderItemId: s.string(),
  quantityReceived: s.int(),
  _keysMap: {
    purchaseOrderItemId: "purchase_order_item_id",
    quantityReceived: "quantity_received",
  },
});
