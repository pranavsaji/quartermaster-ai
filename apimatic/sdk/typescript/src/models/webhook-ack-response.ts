import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { outcomeSchema, type Outcome } from "./outcome.js";

/** `POST /webhooks/paypal`: acknowledgement PayPal receives for a verified event. */
export type WebhookAckResponse = {
  /** Always true: the notification was accepted. Always true. */
  received: boolean;
  /** How the notification was handled. */
  outcome: Outcome;
};

export const webhookAckResponseSchema: Schema<WebhookAckResponse> = s.object<WebhookAckResponse>({
  received: s.boolean(),
  outcome: outcomeSchema,
});
