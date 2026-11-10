import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Reorder recommendation for one stock item. */
export type ForecastLineDto = {
  /** Id of the related inventory item. */
  inventoryItemId: string;
  /** Stock-keeping unit code. */
  sku: string;
  /** Display name. */
  name: string;
  /** Unit of measure (each, liter, case...). */
  unit: string;
  baseDailyUsage: number;
  /** Demand relative to normal (1 = normal, 1.25 = 25% busier). */
  demandMultiplier: number;
  forecastDailyUsage: number;
  /** Days from order to delivery. */
  leadTimeDays: number;
  /** Units to keep on hand as a buffer. */
  safetyStock: number;
  /** Days of usage an order should cover. */
  coverageDays: number;
  /** Units currently in stock. */
  onHand: number;
  inboundConfirmed: number;
  committed: number;
  available: number;
  reorderPoint: number;
  targetStock: number;
  needsReorder: boolean;
  suggestedQuantity: number;
  explanation: string;
};

export const forecastLineDtoSchema: Schema<ForecastLineDto> = s.object<ForecastLineDto>({
  inventoryItemId: s.string(),
  sku: s.string(),
  name: s.string(),
  unit: s.string(),
  baseDailyUsage: s.float64(),
  demandMultiplier: s.float64(),
  forecastDailyUsage: s.float64(),
  leadTimeDays: s.int(),
  safetyStock: s.int(),
  coverageDays: s.int(),
  onHand: s.int(),
  inboundConfirmed: s.int(),
  committed: s.int(),
  available: s.int(),
  reorderPoint: s.int(),
  targetStock: s.float64(),
  needsReorder: s.boolean(),
  suggestedQuantity: s.float64(),
  explanation: s.string(),
  _keysMap: {
    inventoryItemId: "inventory_item_id",
    baseDailyUsage: "base_daily_usage",
    demandMultiplier: "demand_multiplier",
    forecastDailyUsage: "forecast_daily_usage",
    leadTimeDays: "lead_time_days",
    safetyStock: "safety_stock",
    coverageDays: "coverage_days",
    onHand: "on_hand",
    inboundConfirmed: "inbound_confirmed",
    reorderPoint: "reorder_point",
    targetStock: "target_stock",
    needsReorder: "needs_reorder",
    suggestedQuantity: "suggested_quantity",
  },
});
