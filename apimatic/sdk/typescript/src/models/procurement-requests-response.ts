import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  procurementRequestSummaryDtoSchema,
  type ProcurementRequestSummaryDto,
} from "./procurement-request-summary-dto.js";

export type ProcurementRequestsResponse = {
  items: ProcurementRequestSummaryDto[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
};

export const procurementRequestsResponseSchema: Schema<ProcurementRequestsResponse> =
  s.object<ProcurementRequestsResponse>({
    items: s.array(s.lazy(() => procurementRequestSummaryDtoSchema)),
    nextCursor: s.nullable(s.string()),
    _keysMap: {
      nextCursor: "next_cursor",
    },
  });
