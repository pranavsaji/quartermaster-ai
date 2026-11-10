import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { productCategorySchema, type ProductCategory } from "./product-category.js";

/** A supplier catalog listing (product, pack size, price). */
export type CatalogItemDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Id of the related supplier. */
  supplierId: string;
  /** Stock-keeping unit code. */
  sku: string;
  /** Short title. */
  title: string;
  /** Free-text description. */
  description: string;
  /** Product category used by the Spend Mandate's category rules. */
  category: ProductCategory;
  /** Id of the related inventory item. */
  inventoryItemId: string | null;
  /** Units in one pack. */
  packQuantity: number;
  /** Unit price, in minor units (cents). */
  unitPriceMinor: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Whether the supplier currently has it in stock. */
  inStock: boolean;
  /** A recurring subscription rather than a one-off purchase. */
  recurring: boolean;
  /**
   * Flagged by injection screening: withheld from the agent, and TrustRail blocks carts with it.
   */
  quarantined: boolean;
  /** Detection rules that triggered the quarantine. */
  quarantineReason: string | null;
  /** When updated happened (ISO 8601, UTC). */
  updatedAt: string;
};

export const catalogItemDtoSchema: Schema<CatalogItemDto> = s.object<CatalogItemDto>({
  id: s.string(),
  supplierId: s.string(),
  sku: s.string(),
  title: s.string(),
  description: s.string(),
  category: productCategorySchema,
  inventoryItemId: s.nullable(s.string()),
  packQuantity: s.int(),
  unitPriceMinor: s.int(),
  currency: s.string(),
  inStock: s.boolean(),
  recurring: s.boolean(),
  quarantined: s.boolean(),
  quarantineReason: s.nullable(s.string()),
  updatedAt: s.string(),
  _keysMap: {
    supplierId: "supplier_id",
    inventoryItemId: "inventory_item_id",
    packQuantity: "pack_quantity",
    unitPriceMinor: "unit_price_minor",
    inStock: "in_stock",
    quarantineReason: "quarantine_reason",
    updatedAt: "updated_at",
  },
});
