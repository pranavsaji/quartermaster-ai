import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Procurement time, in milliseconds. */
export type ProcurementTimeMs = {
  median: number | null;
  p90: number | null;
};

export const procurementTimeMsSchema: Schema<ProcurementTimeMs> = s.object<ProcurementTimeMs>({
  median: s.nullable(s.float64()),
  p90: s.nullable(s.float64()),
});
