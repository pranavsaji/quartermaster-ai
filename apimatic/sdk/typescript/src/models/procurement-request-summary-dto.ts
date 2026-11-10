import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { requestStatusSchema, type RequestStatus } from "./request-status.js";

/** A procurement request in a list. */
export type ProcurementRequestSummaryDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Procurement request lifecycle. */
  status: RequestStatus;
  /** The natural-language instruction from the restaurant. */
  instruction: string;
  /** Total, in minor units (cents). */
  totalMinor: number | null;
  /** ISO 4217 currency code. */
  currency: string;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
};

export const procurementRequestSummaryDtoSchema: Schema<ProcurementRequestSummaryDto> =
  s.object<ProcurementRequestSummaryDto>({
    id: s.string(),
    status: requestStatusSchema,
    instruction: s.string(),
    totalMinor: s.nullable(s.int()),
    currency: s.string(),
    createdAt: s.string(),
    _keysMap: {
      totalMinor: "total_minor",
      createdAt: "created_at",
    },
  });
