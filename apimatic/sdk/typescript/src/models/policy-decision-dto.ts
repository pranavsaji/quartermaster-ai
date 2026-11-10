import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { policyCheckDtoSchema, type PolicyCheckDto } from "./policy-check-dto.js";
import { policyDecisionKindSchema, type PolicyDecisionKind } from "./policy-decision-kind.js";
import { violationDtoSchema, type ViolationDto } from "./violation-dto.js";

/** A recorded TrustRail decision with its checks and violations. */
export type PolicyDecisionDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Id of the related purchase order. */
  purchaseOrderId: string;
  /** TrustRail's verdict on a cart. */
  decision: PolicyDecisionKind;
  violations: ViolationDto[];
  checks: PolicyCheckDto[];
  /** An owner must approve every purchase (always true). */
  humanApprovalRequired: boolean;
  mandateVersion: number;
  policyVersion: string;
  inputDigest: string;
  /** When evaluated happened (ISO 8601, UTC). */
  evaluatedAt: string;
};

export const policyDecisionDtoSchema: Schema<PolicyDecisionDto> = s.object<PolicyDecisionDto>({
  id: s.string(),
  purchaseOrderId: s.string(),
  decision: policyDecisionKindSchema,
  violations: s.array(s.lazy(() => violationDtoSchema)),
  checks: s.array(s.lazy(() => policyCheckDtoSchema)),
  humanApprovalRequired: s.boolean(),
  mandateVersion: s.float64(),
  policyVersion: s.string(),
  inputDigest: s.string(),
  evaluatedAt: s.string(),
  _keysMap: {
    purchaseOrderId: "purchase_order_id",
    humanApprovalRequired: "human_approval_required",
    mandateVersion: "mandate_version",
    policyVersion: "policy_version",
    inputDigest: "input_digest",
    evaluatedAt: "evaluated_at",
  },
});
