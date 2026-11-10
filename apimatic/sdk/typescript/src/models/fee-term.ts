import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { kind1Schema, type Kind1 } from "./kind1.js";

export type FeeTerm = {
  /** Stable machine-readable code. */
  code: string;
  label: string;
  /** Kind of entry. */
  kind: Kind1;
  /** Amount, in minor units (cents). */
  amountMinor: number;
  /** Waived over, in minor units (cents). */
  waivedOverMinor: number | null;
};

export const feeTermSchema: Schema<FeeTerm> = s.object<FeeTerm>({
  code: s.string(),
  label: s.string(),
  kind: kind1Schema,
  amountMinor: s.int(),
  waivedOverMinor: s.nullable(s.int()),
  _keysMap: {
    amountMinor: "amount_minor",
    waivedOverMinor: "waived_over_minor",
  },
});
