import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  payPalNotificationStatusDtoSchema,
  type PayPalNotificationStatusDto,
} from "./pay-pal-notification-status-dto.js";

export type SecurityPaypalNotificationsResponse = {
  /**
   * Whether PayPal's signed notifications (webhooks) are reaching this deployment for an
   * organisation.
   */
  status: PayPalNotificationStatusDto;
};

export const securityPaypalNotificationsResponseSchema: Schema<SecurityPaypalNotificationsResponse> =
  s.object<SecurityPaypalNotificationsResponse>({
    status: payPalNotificationStatusDtoSchema,
  });
