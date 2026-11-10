import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Reason given by the person making the change. */
export const Reason = {
  CountCorrection: "COUNT_CORRECTION",
  Waste: "WASTE",
  Consumption: "CONSUMPTION",
  ManualReceipt: "MANUAL_RECEIPT",
} as const;
export type Reason = (typeof Reason)[keyof typeof Reason] | (string & {});

export const reasonSchema: EnumSchema<Reason> = s.enumOf<Reason>(Reason);
