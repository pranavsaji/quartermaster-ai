import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Delivery progress. */
export const DeliveryStatus = {
  Scheduled: "SCHEDULED",
  InTransit: "IN_TRANSIT",
  Delayed: "DELAYED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus] | (string & {});

export const deliveryStatusSchema: EnumSchema<DeliveryStatus> = s.enumOf<DeliveryStatus>(DeliveryStatus);
