import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** One TrustRail policy check and its result. */
export type PolicyCheckDto = {
  /** Stable machine-readable code. */
  code: string;
  passed: boolean;
  detail: string;
};

export const policyCheckDtoSchema: Schema<PolicyCheckDto> = s.object<PolicyCheckDto>({
  code: s.string(),
  passed: s.boolean(),
  detail: s.string(),
});
