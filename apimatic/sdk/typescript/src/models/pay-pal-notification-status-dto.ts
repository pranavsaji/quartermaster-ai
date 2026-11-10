import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/**
 * Whether PayPal's signed notifications (webhooks) are reaching this deployment for an
 * organisation.
 */
export type PayPalNotificationStatusDto = {
  configured: boolean;
  /** When last received happened (ISO 8601, UTC). */
  lastReceivedAt: string | null;
  lastEventType: string | null;
  received24H: number;
  /** Completed captures in the last 7 days with no verified PayPal notification. */
  unconfirmedCaptures7D: number;
  rejectedSignatures24H: number;
};

export const payPalNotificationStatusDtoSchema: Schema<PayPalNotificationStatusDto> =
  s.object<PayPalNotificationStatusDto>({
    configured: s.boolean(),
    lastReceivedAt: s.nullable(s.string()),
    lastEventType: s.nullable(s.string()),
    received24H: s.int(),
    unconfirmedCaptures7D: s.int(),
    rejectedSignatures24H: s.int(),
    _keysMap: {
      lastReceivedAt: "last_received_at",
      lastEventType: "last_event_type",
      received24H: "received_24h",
      unconfirmedCaptures7D: "unconfirmed_captures_7d",
      rejectedSignatures24H: "rejected_signatures_24h",
    },
  });
