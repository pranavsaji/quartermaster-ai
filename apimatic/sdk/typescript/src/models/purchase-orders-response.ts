import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { purchaseOrderDtoSchema, type PurchaseOrderDto } from "./purchase-order-dto.js";

export type PurchaseOrdersResponse = {
  items: PurchaseOrderDto[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
};

export const purchaseOrdersResponseSchema: Schema<PurchaseOrdersResponse> = s.object<PurchaseOrdersResponse>({
  items: s.array(s.lazy(() => purchaseOrderDtoSchema)),
  nextCursor: s.nullable(s.string()),
  _keysMap: {
    nextCursor: "next_cursor",
  },
});
