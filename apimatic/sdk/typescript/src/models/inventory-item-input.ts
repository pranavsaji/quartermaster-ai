import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { categorySchema, type Category } from "./category.js";

/** Editable details of a stock item (quantities change through adjustments). */
export type InventoryItemInput = {
  /** Stock-keeping unit code. */
  sku: string;
  /** Display name. */
  name: string;
  /** Product category. */
  category: Category;
  /** Unit of measure (each, liter, case...). */
  unit: string;
  /** Units to keep on hand as a buffer. */
  safetyStock: number;
  /** Days of usage an order should cover. */
  coverageDays: number;
  /** Lead time for this item, overriding the supplier's (null = use supplier's). */
  leadTimeDaysOverride?: number | null;
  /** Id of the related preferred supplier. */
  preferredSupplierId?: string | null;
  /** Phrase used to look up market prices (Channel3). */
  searchQuery: string;
  /** Words that identify this item in natural-language requests. */
  keywords?: string[];
};

export const inventoryItemInputSchema: Schema<InventoryItemInput> = s.object<InventoryItemInput>({
  sku: s.string(),
  name: s.string(),
  category: categorySchema,
  unit: s.string(),
  safetyStock: s.int(),
  coverageDays: s.int(),
  leadTimeDaysOverride: s.optionalNullable(s.int()),
  preferredSupplierId: s.optionalNullable(s.string()),
  searchQuery: s.string(),
  keywords: s.optional(s.array(s.string())),
  _keysMap: {
    safetyStock: "safety_stock",
    coverageDays: "coverage_days",
    leadTimeDaysOverride: "lead_time_days_override",
    preferredSupplierId: "preferred_supplier_id",
    searchQuery: "search_query",
  },
});
