import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { inventoryItemDtoSchema, type InventoryItemDto } from "./inventory-item-dto.js";

export type InventoryResponse1 = {
  /** A stock item with current levels, usage and reorder status. */
  item: InventoryItemDto;
};

export const inventoryResponse1Schema: Schema<InventoryResponse1> = s.object<InventoryResponse1>({
  item: inventoryItemDtoSchema,
});
