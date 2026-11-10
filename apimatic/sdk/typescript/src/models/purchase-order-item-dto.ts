import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { lineKindSchema, type LineKind } from "./line-kind.js";
import { productCategorySchema, type ProductCategory } from "./product-category.js";

/** A purchase order line. */
export type PurchaseOrderItemDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Kind of cart or invoice line. */
  kind: LineKind;
  /** Stock-keeping unit code. */
  sku: string | null;
  /** Free-text description. */
  description: string;
  /** Product category. */
  category: ProductCategory | null;
  quantity: number;
  /** Unit price, in minor units (cents). */
  unitPriceMinor: number;
  /** Line total, in minor units (cents). */
  lineTotalMinor: number;
  /** Id of the related inventory item. */
  inventoryItemId: string | null;
  /** Units in one pack. */
  packQuantity: number | null;
};

export const purchaseOrderItemDtoSchema: Schema<PurchaseOrderItemDto> = s.object<PurchaseOrderItemDto>({
  id: s.string(),
  kind: lineKindSchema,
  sku: s.nullable(s.string()),
  description: s.string(),
  category: s.nullable(s.lazy(() => productCategorySchema)),
  quantity: s.int(),
  unitPriceMinor: s.int(),
  lineTotalMinor: s.int(),
  inventoryItemId: s.nullable(s.string()),
  packQuantity: s.nullable(s.int()),
  _keysMap: {
    unitPriceMinor: "unit_price_minor",
    lineTotalMinor: "line_total_minor",
    inventoryItemId: "inventory_item_id",
    packQuantity: "pack_quantity",
  },
});
