import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { categorySchema, type Category } from "./category.js";

/** Fields for creating or updating a catalog listing. */
export type CatalogItemInput = {
  /** Stock-keeping unit code. */
  sku: string;
  /** Short title. */
  title: string;
  /** Free-text description. */
  description?: string;
  /** Product category. */
  category: Category;
  /** Id of the related inventory item. */
  inventoryItemId?: string | null;
  /** Units in one pack. */
  packQuantity: number;
  /** Unit price, in minor units (cents). */
  unitPriceMinor: number;
  /** Whether the supplier currently has it in stock. @default true */
  inStock?: boolean;
  /** A recurring subscription rather than a one-off purchase. @default false */
  recurring?: boolean;
};

export const catalogItemInputSchema: Schema<CatalogItemInput> = s.object<CatalogItemInput>({
  sku: s.string(),
  title: s.string(),
  description: s.optional(s.string()),
  category: categorySchema,
  inventoryItemId: s.optionalNullable(s.string()),
  packQuantity: s.int(),
  unitPriceMinor: s.int(),
  inStock: s.defaulted(s.boolean(), true),
  recurring: s.defaulted(s.boolean(), false),
  _keysMap: {
    inventoryItemId: "inventory_item_id",
    packQuantity: "pack_quantity",
    unitPriceMinor: "unit_price_minor",
    inStock: "in_stock",
  },
});
