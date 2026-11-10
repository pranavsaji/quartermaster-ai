import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Kind of cart or invoice line. */
export const LineKind = {
  Product: "PRODUCT",
  Shipping: "SHIPPING",
  Tax: "TAX",
  Fee: "FEE",
} as const;
export type LineKind = (typeof LineKind)[keyof typeof LineKind] | (string & {});

export const lineKindSchema: EnumSchema<LineKind> = s.enumOf<LineKind>(LineKind);
