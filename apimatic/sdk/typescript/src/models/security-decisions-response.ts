import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { policyDecisionDtoSchema, type PolicyDecisionDto } from "./policy-decision-dto.js";

export type SecurityDecisionsResponse = {
  items: PolicyDecisionDto[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
};

export const securityDecisionsResponseSchema: Schema<SecurityDecisionsResponse> =
  s.object<SecurityDecisionsResponse>({
    items: s.array(s.lazy(() => policyDecisionDtoSchema)),
    nextCursor: s.nullable(s.string()),
    _keysMap: {
      nextCursor: "next_cursor",
    },
  });
