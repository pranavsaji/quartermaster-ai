import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { dataSourceSchema, type DataSource } from "./data-source.js";
import { productCategorySchema, type ProductCategory } from "./product-category.js";
import { statusSchema, type Status } from "./status.js";

/** A stock item with current levels, usage and reorder status. */
export type InventoryItemDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Stock-keeping unit code. */
  sku: string;
  /** Display name. */
  name: string;
  /** Product category used by the Spend Mandate's category rules. */
  category: ProductCategory;
  /** Unit of measure (each, liter, case...). */
  unit: string;
  /** Units currently in stock. */
  onHand: number;
  inboundConfirmed: number;
  committed: number;
  available: number;
  avgDailyUsage: number;
  /** Days from order to delivery. */
  leadTimeDays: number;
  /** Units to keep on hand as a buffer. */
  safetyStock: number;
  /** Days of usage an order should cover. */
  coverageDays: number;
  reorderPoint: number;
  daysOfCover: number | null;
  /** Current status. */
  status: Status;
  /** Id of the related preferred supplier. */
  preferredSupplierId: string | null;
  /** Where a piece of commercial data came from (shown as a label in the UI). */
  dataSource: DataSource;
  /**
   * Editable details (PUT /inventory/:id round-trips them). Optional until every API build sends
   * them; the edit form treats a missing value as blank.
   */
  searchQuery: string;
  /** Words that identify this item in natural-language requests. */
  keywords: string[];
  /** Lead time for this item, overriding the supplier's (null = use supplier's). */
  leadTimeDaysOverride: number | null;
};

export const inventoryItemDtoSchema: Schema<InventoryItemDto> = s.object<InventoryItemDto>({
  id: s.string(),
  sku: s.string(),
  name: s.string(),
  category: productCategorySchema,
  unit: s.string(),
  onHand: s.int(),
  inboundConfirmed: s.int(),
  committed: s.int(),
  available: s.int(),
  avgDailyUsage: s.float64(),
  leadTimeDays: s.int(),
  safetyStock: s.int(),
  coverageDays: s.int(),
  reorderPoint: s.int(),
  daysOfCover: s.nullable(s.float64()),
  status: statusSchema,
  preferredSupplierId: s.nullable(s.string()),
  dataSource: dataSourceSchema,
  searchQuery: s.string(),
  keywords: s.array(s.string()),
  leadTimeDaysOverride: s.nullable(s.float64()),
  _keysMap: {
    onHand: "on_hand",
    inboundConfirmed: "inbound_confirmed",
    avgDailyUsage: "avg_daily_usage",
    leadTimeDays: "lead_time_days",
    safetyStock: "safety_stock",
    coverageDays: "coverage_days",
    reorderPoint: "reorder_point",
    daysOfCover: "days_of_cover",
    preferredSupplierId: "preferred_supplier_id",
    dataSource: "data_source",
    searchQuery: "search_query",
    leadTimeDaysOverride: "lead_time_days_override",
  },
});
