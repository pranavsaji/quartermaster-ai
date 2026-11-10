import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** TrustRail's verdict on a cart. */
export const PolicyDecisionKind = {
  Allow: "ALLOW",
  ReviewRequired: "REVIEW_REQUIRED",
  Block: "BLOCK",
} as const;
export type PolicyDecisionKind = (typeof PolicyDecisionKind)[keyof typeof PolicyDecisionKind] | (string & {});

export const policyDecisionKindSchema: EnumSchema<PolicyDecisionKind> =
  s.enumOf<PolicyDecisionKind>(PolicyDecisionKind);
