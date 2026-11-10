import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { allowedCategorySchema, type AllowedCategory } from "./allowed-category.js";
import { duplicateActionSchema, type DuplicateAction } from "./duplicate-action.js";
import { marketPriceActionSchema, type MarketPriceAction } from "./market-price-action.js";

/** A new Spend Mandate version (optimistic concurrency on `expected_version`). */
export type SpendMandateInput = {
  /** ISO 4217 currency code. @default "USD" */
  currency?: "USD";
  /** Weekly budget, in minor units (cents). */
  weeklyBudgetMinor: number;
  /** Per order limit, in minor units (cents). */
  perOrderLimitMinor: number;
  /** Auto approval limit, in minor units (cents). */
  autoApprovalLimitMinor: number;
  /** An owner must approve every purchase (always true). Always true. */
  humanApprovalRequired: boolean;
  /** Suppliers the owner has approved for payment. */
  approvedSupplierIds: string[];
  /** Product categories purchases may contain. */
  allowedCategories: AllowedCategory[];
  /** Max market price premium, in percent. */
  maxMarketPricePremiumPct: number;
  /** What happens when a price exceeds the market premium: REVIEW or BLOCK. */
  marketPriceAction: MarketPriceAction;
  /** Duplicate window, in hours. */
  duplicateWindowHours: number;
  /** What happens to a likely duplicate order: REVIEW or BLOCK. */
  duplicateAction: DuplicateAction;
  /** Whether recurring purchases are allowed. */
  subscriptionsAllowed: boolean;
  /** Certificate ttl, in minutes. */
  certificateTtlMinutes: number;
  maxQuantityMultipleOfNeed: number;
  /** The mandate version being edited (refused if it changed meanwhile). */
  expectedVersion: number;
};

export const spendMandateInputSchema: Schema<SpendMandateInput> = s.object<SpendMandateInput>({
  currency: s.defaulted(s.literal("USD"), "USD"),
  weeklyBudgetMinor: s.int(),
  perOrderLimitMinor: s.int(),
  autoApprovalLimitMinor: s.int(),
  humanApprovalRequired: s.boolean(),
  approvedSupplierIds: s.array(s.string()),
  allowedCategories: s.array(s.lazy(() => allowedCategorySchema)),
  maxMarketPricePremiumPct: s.int(),
  marketPriceAction: marketPriceActionSchema,
  duplicateWindowHours: s.int(),
  duplicateAction: duplicateActionSchema,
  subscriptionsAllowed: s.boolean(),
  certificateTtlMinutes: s.int(),
  maxQuantityMultipleOfNeed: s.float64(),
  expectedVersion: s.int(),
  _keysMap: {
    weeklyBudgetMinor: "weekly_budget_minor",
    perOrderLimitMinor: "per_order_limit_minor",
    autoApprovalLimitMinor: "auto_approval_limit_minor",
    humanApprovalRequired: "human_approval_required",
    approvedSupplierIds: "approved_supplier_ids",
    allowedCategories: "allowed_categories",
    maxMarketPricePremiumPct: "max_market_price_premium_pct",
    marketPriceAction: "market_price_action",
    duplicateWindowHours: "duplicate_window_hours",
    duplicateAction: "duplicate_action",
    subscriptionsAllowed: "subscriptions_allowed",
    certificateTtlMinutes: "certificate_ttl_minutes",
    maxQuantityMultipleOfNeed: "max_quantity_multiple_of_need",
    expectedVersion: "expected_version",
  },
});
