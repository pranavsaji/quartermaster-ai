import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type PaypalWebhooks = {
  /** When last received happened (ISO 8601, UTC). */
  lastReceivedAt: string | null;
  received24H: number;
  rejected24H: number;
};

export const paypalWebhooksSchema: Schema<PaypalWebhooks> = s.object<PaypalWebhooks>({
  lastReceivedAt: s.nullable(s.string()),
  received24H: s.int(),
  rejected24H: s.int(),
  _keysMap: {
    lastReceivedAt: "last_received_at",
    received24H: "received_24h",
    rejected24H: "rejected_24h",
  },
});
