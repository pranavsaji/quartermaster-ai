import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { aiModeSchema, type AiMode } from "./ai-mode.js";

/** How the request was interpreted: items, demand multiplier, budget and date. */
export type InterpretedIntentDto = {
  /** Ids of the related inventory items. */
  inventoryItemIds: string[];
  /** Demand relative to normal (1 = normal, 1.25 = 25% busier). */
  demandMultiplier: number;
  /** Budget limit, in minor units (cents). */
  budgetLimitMinor: number | null;
  /** Date the goods are needed by (YYYY-MM-DD). */
  requiredBy: string | null;
  notes: string;
  unsupportedRequests: string[];
  /** Whether the language model or the deterministic fallback interpreted a request. */
  aiMode: AiMode;
};

export const interpretedIntentDtoSchema: Schema<InterpretedIntentDto> = s.object<InterpretedIntentDto>({
  inventoryItemIds: s.array(s.string()),
  demandMultiplier: s.float64(),
  budgetLimitMinor: s.nullable(s.int()),
  requiredBy: s.nullable(s.string()),
  notes: s.string(),
  unsupportedRequests: s.array(s.string()),
  aiMode: aiModeSchema,
  _keysMap: {
    inventoryItemIds: "inventory_item_ids",
    demandMultiplier: "demand_multiplier",
    budgetLimitMinor: "budget_limit_minor",
    requiredBy: "required_by",
    unsupportedRequests: "unsupported_requests",
    aiMode: "ai_mode",
  },
});
