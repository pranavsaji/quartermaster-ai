import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { deliveryDtoSchema, type DeliveryDto } from "./delivery-dto.js";

export type DeliveriesResponse = {
  items: DeliveryDto[];
};

export const deliveriesResponseSchema: Schema<DeliveriesResponse> = s.object<DeliveriesResponse>({
  items: s.array(s.lazy(() => deliveryDtoSchema)),
});
