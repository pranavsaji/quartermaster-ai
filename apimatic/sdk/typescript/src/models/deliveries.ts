import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Deliveries = {
  scheduled: number;
  delayed: number;
  delivered: number;
};

export const deliveriesSchema: Schema<Deliveries> = s.object<Deliveries>({
  scheduled: s.float64(),
  delayed: s.float64(),
  delivered: s.float64(),
});
