import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { deliveryDtoSchema, type DeliveryDto } from "./delivery-dto.js";

export type DeliveriesReceiveResponse = {
  /** A delivery for a paid purchase order (synthetic in the sandbox). */
  delivery: DeliveryDto;
};

export const deliveriesReceiveResponseSchema: Schema<DeliveriesReceiveResponse> =
  s.object<DeliveriesReceiveResponse>({
    delivery: deliveryDtoSchema,
  });
