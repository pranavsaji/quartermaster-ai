import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { inventoryItemDtoSchema, type InventoryItemDto } from "./inventory-item-dto.js";

export type InventoryAdjustmentsResponse = {
  /** A stock item with current levels, usage and reorder status. */
  item: InventoryItemDto;
};

export const inventoryAdjustmentsResponseSchema: Schema<InventoryAdjustmentsResponse> =
  s.object<InventoryAdjustmentsResponse>({
    item: inventoryItemDtoSchema,
  });
