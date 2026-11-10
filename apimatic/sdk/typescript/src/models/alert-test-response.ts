import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** `POST /ops/alerts/test`: where the test alert went. */
export type AlertTestResponse = {
  emailRecipients: number;
  emailsSent: number;
  webhookSent: boolean;
};

export const alertTestResponseSchema: Schema<AlertTestResponse> = s.object<AlertTestResponse>({
  emailRecipients: s.int(),
  emailsSent: s.int(),
  webhookSent: s.boolean(),
  _keysMap: {
    emailRecipients: "email_recipients",
    emailsSent: "emails_sent",
    webhookSent: "webhook_sent",
  },
});
