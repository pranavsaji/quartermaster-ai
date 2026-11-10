import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Inventory = {
  itemsLow: number;
  itemsCritical: number;
  itemsOut: number;
};

export const inventorySchema: Schema<Inventory> = s.object<Inventory>({
  itemsLow: s.int(),
  itemsCritical: s.int(),
  itemsOut: s.int(),
  _keysMap: {
    itemsLow: "items_low",
    itemsCritical: "items_critical",
    itemsOut: "items_out",
  },
});
