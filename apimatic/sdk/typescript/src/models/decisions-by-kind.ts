import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { policyDecisionKindSchema, type PolicyDecisionKind } from "./policy-decision-kind.js";

export type DecisionsByKind = {
  /** TrustRail's verdict on a cart. */
  decision: PolicyDecisionKind;
  count: number;
};

export const decisionsByKindSchema: Schema<DecisionsByKind> = s.object<DecisionsByKind>({
  decision: policyDecisionKindSchema,
  count: s.int(),
});
