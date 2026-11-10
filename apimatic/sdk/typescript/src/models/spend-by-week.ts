import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type SpendByWeek = {
  weekStart: string;
  /** Captured, in minor units (cents). */
  capturedMinor: number;
  /** Reserved, in minor units (cents). */
  reservedMinor: number;
};

export const spendByWeekSchema: Schema<SpendByWeek> = s.object<SpendByWeek>({
  weekStart: s.string(),
  capturedMinor: s.int(),
  reservedMinor: s.int(),
  _keysMap: {
    weekStart: "week_start",
    capturedMinor: "captured_minor",
    reservedMinor: "reserved_minor",
  },
});
