import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { inventoryItemDtoSchema, type InventoryItemDto } from "./inventory-item-dto.js";

export type InventoryResponse = {
  items: InventoryItemDto[];
};

export const inventoryResponseSchema: Schema<InventoryResponse> = s.object<InventoryResponse>({
  items: s.array(s.lazy(() => inventoryItemDtoSchema)),
});
