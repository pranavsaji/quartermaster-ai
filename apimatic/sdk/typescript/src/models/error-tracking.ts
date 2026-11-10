import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ErrorTracking = {
  openErrors: number;
  sentry: boolean;
};

export const errorTrackingSchema: Schema<ErrorTracking> = s.object<ErrorTracking>({
  openErrors: s.int(),
  sentry: s.boolean(),
  _keysMap: {
    openErrors: "open_errors",
  },
});
