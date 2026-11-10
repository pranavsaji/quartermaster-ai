import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { budgetDtoSchema, type BudgetDto } from "./budget-dto.js";
import { spendMandateDtoSchema, type SpendMandateDto } from "./spend-mandate-dto.js";

export type MandatesCurrentResponse = {
  /** The owner's Spend Mandate: what the business permits across purchases. */
  mandate: SpendMandateDto;
  /** The current weekly budget: limit, reserved and spent amounts. */
  budget: BudgetDto;
};

export const mandatesCurrentResponseSchema: Schema<MandatesCurrentResponse> =
  s.object<MandatesCurrentResponse>({
    mandate: spendMandateDtoSchema,
    budget: budgetDtoSchema,
  });
