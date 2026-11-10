import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { deliveryDtoSchema, type DeliveryDto } from "./delivery-dto.js";

export type DeliveriesDelayResponse = {
  /** A delivery for a paid purchase order (synthetic in the sandbox). */
  delivery: DeliveryDto;
};

export const deliveriesDelayResponseSchema: Schema<DeliveriesDelayResponse> =
  s.object<DeliveriesDelayResponse>({
    delivery: deliveryDtoSchema,
  });
