import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { Currency, currencySchema } from "./currency.js";

/** A natural-language purchasing instruction for the agent. */
export type CreateProcurementRequest = {
  /** The natural-language instruction from the restaurant. */
  instruction: string;
  /** ISO 4217 currency code. @default Currency.Usd */
  currency?: Currency;
  /** Budget limit, in minor units (cents). */
  budgetLimitMinor?: number;
  /** Date the goods are needed by (YYYY-MM-DD). */
  requiredBy?: string;
  /** @default true */
  allowAlternatives?: boolean;
  /** Demand relative to normal (1 = normal, 1.25 = 25% busier). */
  demandMultiplier?: number;
};

export const createProcurementRequestSchema: Schema<CreateProcurementRequest> =
  s.object<CreateProcurementRequest>({
    instruction: s.string(),
    currency: s.defaulted(currencySchema, Currency.Usd),
    budgetLimitMinor: s.optional(s.int()),
    requiredBy: s.optional(s.string()),
    allowAlternatives: s.defaulted(s.boolean(), true),
    demandMultiplier: s.optional(s.float64()),
    _keysMap: {
      budgetLimitMinor: "budget_limit_minor",
      requiredBy: "required_by",
      allowAlternatives: "allow_alternatives",
      demandMultiplier: "demand_multiplier",
    },
  });
