import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { forecastLineDtoSchema, type ForecastLineDto } from "./forecast-line-dto.js";

/** A stored forecast run with its lines. */
export type ForecastRunDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Demand relative to normal (1 = normal, 1.25 = 25% busier). */
  demandMultiplier: number;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
  /** @default "REORDER_POINT_V1" */
  method?: "REORDER_POINT_V1";
  /** Line items. */
  lines: ForecastLineDto[];
};

export const forecastRunDtoSchema: Schema<ForecastRunDto> = s.object<ForecastRunDto>({
  id: s.string(),
  demandMultiplier: s.float64(),
  createdAt: s.string(),
  method: s.defaulted(s.literal("REORDER_POINT_V1"), "REORDER_POINT_V1"),
  lines: s.array(s.lazy(() => forecastLineDtoSchema)),
  _keysMap: {
    demandMultiplier: "demand_multiplier",
    createdAt: "created_at",
  },
});
