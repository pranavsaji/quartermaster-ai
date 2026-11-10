import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Parameters for a reorder forecast. */
export type ForecastRequest = {
  /** Ids of the related inventory items. */
  inventoryItemIds?: string[];
  /** Demand relative to normal (1 = normal, 1.25 = 25% busier). @default 1 */
  demandMultiplier?: number;
  /** Horizon, in days. */
  horizonDays?: number;
};

export const forecastRequestSchema: Schema<ForecastRequest> = s.object<ForecastRequest>({
  inventoryItemIds: s.optional(s.array(s.string())),
  demandMultiplier: s.defaulted(s.float64(), 1),
  horizonDays: s.optional(s.int()),
  _keysMap: {
    inventoryItemIds: "inventory_item_ids",
    demandMultiplier: "demand_multiplier",
    horizonDays: "horizon_days",
  },
});
