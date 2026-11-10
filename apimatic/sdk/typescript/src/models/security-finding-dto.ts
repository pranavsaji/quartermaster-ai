import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { findingTypeSchema, type FindingType } from "./finding-type.js";
import { severitySchema, type Severity } from "./severity.js";

/** A security finding (prompt injection, unauthorised fee, duplicate, signature failure...). */
export type SecurityFindingDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Kind of security finding. */
  type: FindingType;
  /** Finding severity. */
  severity: Severity;
  /** Short title. */
  title: string;
  /** Free-text description. */
  description: string;
  sourceKind: string;
  /** Id of the related source. */
  sourceId: string | null;
  evidence: Record<string, unknown>;
  /** Id of the related related purchase order. */
  relatedPurchaseOrderId: string | null;
  /** Id of the related related request. */
  relatedRequestId: string | null;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
};

export const securityFindingDtoSchema: Schema<SecurityFindingDto> = s.object<SecurityFindingDto>({
  id: s.string(),
  type: findingTypeSchema,
  severity: severitySchema,
  title: s.string(),
  description: s.string(),
  sourceKind: s.string(),
  sourceId: s.nullable(s.string()),
  evidence: s.record(s.string(), s.unknown()),
  relatedPurchaseOrderId: s.nullable(s.string()),
  relatedRequestId: s.nullable(s.string()),
  createdAt: s.string(),
  _keysMap: {
    sourceKind: "source_kind",
    sourceId: "source_id",
    relatedPurchaseOrderId: "related_purchase_order_id",
    relatedRequestId: "related_request_id",
    createdAt: "created_at",
  },
});
