import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Move a delivery's expected date, with a reason. */
export type DelayDeliveryRequest = {
  /** New expected date (YYYY-MM-DD). */
  newExpectedDate: string;
  /** Reason given by the person making the change. */
  reason: string;
};

export const delayDeliveryRequestSchema: Schema<DelayDeliveryRequest> = s.object<DelayDeliveryRequest>({
  newExpectedDate: s.string(),
  reason: s.string(),
  _keysMap: {
    newExpectedDate: "new_expected_date",
  },
});
