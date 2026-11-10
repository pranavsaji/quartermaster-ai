import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { lineSchema, type Line } from "./line.js";

/** Quantities received per purchase order line. */
export type ReceiveDeliveryRequest = {
  /** Line items. */
  lines: Line[];
  /** Optional note. */
  note?: string;
};

export const receiveDeliveryRequestSchema: Schema<ReceiveDeliveryRequest> = s.object<ReceiveDeliveryRequest>({
  lines: s.array(s.lazy(() => lineSchema)),
  note: s.optional(s.string()),
});
