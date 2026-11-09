/**
 * Explainable reorder-point forecasting. All arithmetic is deterministic; a language model may
 * explain or prioritise these numbers but never computes them.
 *
 *   reorder point      = forecast daily usage × lead time + safety stock
 *   target stock       = forecast daily usage × (lead time + coverage days) + safety stock
 *   available          = on hand + confirmed inbound − committed
 *   suggested quantity = max(0, target stock − available), rounded up to whole packs
 *
 * This is a functional prototype model, not a validated demand forecast.
 */

export interface ForecastItemInput {
  inventory_item_id: string;
  sku: string;
  name: string;
  unit: string;
  on_hand: number;
  inbound_confirmed: number;
  committed: number;
  /** Daily consumption observations, most recent last. */
  daily_usage_history: number[];
  lead_time_days: number;
  safety_stock: number;
  coverage_days: number;
  pack_quantity?: number;
}

export interface ForecastLine {
  inventory_item_id: string;
  sku: string;
  name: string;
  unit: string;
  base_daily_usage: number;
  demand_multiplier: number;
  forecast_daily_usage: number;
  lead_time_days: number;
  safety_stock: number;
  coverage_days: number;
  on_hand: number;
  inbound_confirmed: number;
  committed: number;
  available: number;
  reorder_point: number;
  target_stock: number;
  needs_reorder: boolean;
  suggested_quantity: number;
  explanation: string;
}

/**
 * Average daily usage over the most recent window, ignoring negative or non-finite readings.
 * A trimmed mean (dropping the single highest and lowest day when there are ≥ 7 days) keeps
 * one unusual service from skewing the estimate.
 */
export function averageDailyUsage(history: number[], windowDays = 14): number {
  const clean = history.filter((v) => Number.isFinite(v) && v >= 0).slice(-windowDays);
  if (clean.length === 0) return 0;
  const sorted = [...clean].sort((a, b) => a - b);
  const trimmed = sorted.length >= 7 ? sorted.slice(1, -1) : sorted;
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return Math.round(mean * 100) / 100;
}

export function forecastItem(item: ForecastItemInput, demandMultiplier = 1): ForecastLine {
  if (!(demandMultiplier > 0) || !Number.isFinite(demandMultiplier)) throw new Error("Demand multiplier must be positive");
  const base = averageDailyUsage(item.daily_usage_history);
  const daily = Math.round(base * demandMultiplier * 100) / 100;
  const lead = Math.max(0, item.lead_time_days);
  const coverage = Math.max(0, item.coverage_days);
  const safety = Math.max(0, item.safety_stock);
  const available = item.on_hand + item.inbound_confirmed - item.committed;
  const reorderPoint = Math.ceil(daily * lead + safety);
  const targetStock = Math.ceil(daily * (lead + coverage) + safety);
  const needsReorder = available <= reorderPoint;
  const rawNeed = needsReorder ? Math.max(0, targetStock - available) : 0;
  const pack = Math.max(1, item.pack_quantity ?? 1);
  const suggested = rawNeed === 0 ? 0 : Math.ceil(rawNeed / pack) * pack;

  const mult = demandMultiplier === 1 ? "" : ` × ${demandMultiplier} demand multiplier`;
  const explanation = needsReorder
    ? `Available ${available} ${item.unit} is at or below the reorder point of ${reorderPoint} (${daily}/day${mult} × ${lead}d lead time + ${safety} safety stock). Ordering ${suggested} brings stock to the ${targetStock} target covering ${coverage} more day(s).`
    : `Available ${available} ${item.unit} is above the reorder point of ${reorderPoint}; no reorder needed.`;

  return {
    inventory_item_id: item.inventory_item_id,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    base_daily_usage: base,
    demand_multiplier: demandMultiplier,
    forecast_daily_usage: daily,
    lead_time_days: lead,
    safety_stock: safety,
    coverage_days: coverage,
    on_hand: item.on_hand,
    inbound_confirmed: item.inbound_confirmed,
    committed: item.committed,
    available,
    reorder_point: reorderPoint,
    target_stock: targetStock,
    needs_reorder: needsReorder,
    suggested_quantity: suggested,
    explanation,
  };
}

export function forecast(items: ForecastItemInput[], demandMultiplier = 1): ForecastLine[] {
  return items.map((i) => forecastItem(i, demandMultiplier));
}

export type StockStatus = "OK" | "LOW" | "CRITICAL" | "OUT";

/** Inventory health for dashboards: OUT at zero, CRITICAL below safety stock, LOW at/below reorder point. */
export function stockStatus(available: number, reorderPoint: number, safetyStock: number): StockStatus {
  if (available <= 0) return "OUT";
  if (available < safetyStock) return "CRITICAL";
  if (available <= reorderPoint) return "LOW";
  return "OK";
}

export function daysOfCover(available: number, dailyUsage: number): number | null {
  if (dailyUsage <= 0) return null;
  return Math.round((available / dailyUsage) * 10) / 10;
}
