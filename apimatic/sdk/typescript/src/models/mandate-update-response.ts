import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { budgetDtoSchema, type BudgetDto } from "./budget-dto.js";
import { spendMandateDtoSchema, type SpendMandateDto } from "./spend-mandate-dto.js";

/** `PUT /mandates/current`. */
export type MandateUpdateResponse = {
  /** The owner's Spend Mandate: what the business permits across purchases. */
  mandate: SpendMandateDto;
  /** The current weekly budget: limit, reserved and spent amounts. */
  budget: BudgetDto;
  /** Active intent certificates revoked because they were signed under the previous version. */
  revokedCertificates: number;
};

export const mandateUpdateResponseSchema: Schema<MandateUpdateResponse> = s.object<MandateUpdateResponse>({
  mandate: spendMandateDtoSchema,
  budget: budgetDtoSchema,
  revokedCertificates: s.int(),
  _keysMap: {
    revokedCertificates: "revoked_certificates",
  },
});
