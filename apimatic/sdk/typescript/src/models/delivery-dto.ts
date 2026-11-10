import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { deliveryStatusSchema, type DeliveryStatus } from "./delivery-status.js";

/** A delivery for a paid purchase order (synthetic in the sandbox). */
export type DeliveryDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Id of the related purchase order. */
  purchaseOrderId: string;
  /** Id of the related supplier. */
  supplierId: string;
  /** Delivery progress. */
  status: DeliveryStatus;
  /** Expected date (YYYY-MM-DD). */
  expectedDate: string;
  /** Original expected date (YYYY-MM-DD). */
  originalExpectedDate: string;
  /** When delivered happened (ISO 8601, UTC). */
  deliveredAt: string | null;
  delayReason: string | null;
  /** Where this data came from. @default "SYNTHETIC" */
  dataSource?: "SYNTHETIC";
};

export const deliveryDtoSchema: Schema<DeliveryDto> = s.object<DeliveryDto>({
  id: s.string(),
  purchaseOrderId: s.string(),
  supplierId: s.string(),
  status: deliveryStatusSchema,
  expectedDate: s.string(),
  originalExpectedDate: s.string(),
  deliveredAt: s.nullable(s.string()),
  delayReason: s.nullable(s.string()),
  dataSource: s.defaulted(s.literal("SYNTHETIC"), "SYNTHETIC"),
  _keysMap: {
    purchaseOrderId: "purchase_order_id",
    supplierId: "supplier_id",
    expectedDate: "expected_date",
    originalExpectedDate: "original_expected_date",
    deliveredAt: "delivered_at",
    delayReason: "delay_reason",
    dataSource: "data_source",
  },
});
