import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Line1 = {
  /** Stock-keeping unit code. */
  sku?: string | null;
  /** Free-text description. */
  description: string;
  quantity: number;
  /** Unit price, in minor units (cents). */
  unitPriceMinor: number;
  /** Line total, in minor units (cents). */
  lineTotalMinor: number;
};

export const line1Schema: Schema<Line1> = s.object<Line1>({
  sku: s.optionalNullable(s.string()),
  description: s.string(),
  quantity: s.int(),
  unitPriceMinor: s.int(),
  lineTotalMinor: s.int(),
  _keysMap: {
    unitPriceMinor: "unit_price_minor",
    lineTotalMinor: "line_total_minor",
  },
});
