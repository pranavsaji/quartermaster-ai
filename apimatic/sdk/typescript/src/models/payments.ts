import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Payments = {
  capturePending: number;
  /** Oldest pending, in minutes. */
  oldestPendingMinutes: number | null;
};

export const paymentsSchema: Schema<Payments> = s.object<Payments>({
  capturePending: s.int(),
  oldestPendingMinutes: s.nullable(s.float64()),
  _keysMap: {
    capturePending: "capture_pending",
    oldestPendingMinutes: "oldest_pending_minutes",
  },
});
