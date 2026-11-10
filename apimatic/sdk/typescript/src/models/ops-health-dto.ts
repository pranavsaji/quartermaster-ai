import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { alertingSchema, type Alerting } from "./alerting.js";
import { emailSchema, type Email } from "./email.js";
import { errorTrackingSchema, type ErrorTracking } from "./error-tracking.js";
import { paymentsSchema, type Payments } from "./payments.js";
import { paypalWebhooksSchema, type PaypalWebhooks } from "./paypal-webhooks.js";

/** Platform health for operators: error tracking, alerting, email, webhooks, payments. */
export type OpsHealthDto = {
  errorTracking: ErrorTracking;
  alerting: Alerting;
  /** Email address. */
  email: Email;
  paypalWebhooks: PaypalWebhooks;
  payments: Payments;
};

export const opsHealthDtoSchema: Schema<OpsHealthDto> = s.object<OpsHealthDto>({
  errorTracking: errorTrackingSchema,
  alerting: alertingSchema,
  email: emailSchema,
  paypalWebhooks: paypalWebhooksSchema,
  payments: paymentsSchema,
  _keysMap: {
    errorTracking: "error_tracking",
    paypalWebhooks: "paypal_webhooks",
  },
});
