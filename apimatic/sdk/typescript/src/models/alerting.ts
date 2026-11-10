import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Alerting = {
  /** Email address. */
  email: boolean;
  webhook: boolean;
  recipients: number;
};

export const alertingSchema: Schema<Alerting> = s.object<Alerting>({
  email: s.boolean(),
  webhook: s.boolean(),
  recipients: s.int(),
});
