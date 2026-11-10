import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** The current weekly budget: limit, reserved and spent amounts. */
export type BudgetDto = {
  periodStart: string;
  periodEnd: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Limit, in minor units (cents). */
  limitMinor: number;
  /** Reserved, in minor units (cents). */
  reservedMinor: number;
  /** Spent, in minor units (cents). */
  spentMinor: number;
  /** Remaining, in minor units (cents). */
  remainingMinor: number;
};

export const budgetDtoSchema: Schema<BudgetDto> = s.object<BudgetDto>({
  periodStart: s.string(),
  periodEnd: s.string(),
  currency: s.string(),
  limitMinor: s.int(),
  reservedMinor: s.int(),
  spentMinor: s.int(),
  remainingMinor: s.int(),
  _keysMap: {
    periodStart: "period_start",
    periodEnd: "period_end",
    limitMinor: "limit_minor",
    reservedMinor: "reserved_minor",
    spentMinor: "spent_minor",
    remainingMinor: "remaining_minor",
  },
});
