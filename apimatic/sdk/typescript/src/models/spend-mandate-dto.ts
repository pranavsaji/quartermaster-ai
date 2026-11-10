import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { duplicateActionSchema, type DuplicateAction } from "./duplicate-action.js";
import { marketPriceActionSchema, type MarketPriceAction } from "./market-price-action.js";
import { productCategorySchema, type ProductCategory } from "./product-category.js";
import { status3Schema, type Status3 } from "./status3.js";

/** The owner's Spend Mandate: what the business permits across purchases. */
export type SpendMandateDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Version number. */
  version: number;
  /** Current status. */
  status: Status3;
  /** ISO 4217 currency code. */
  currency: string;
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
  allowedCategories: ProductCategory[];
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
  createdBy: string;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
};

export const spendMandateDtoSchema: Schema<SpendMandateDto> = s.object<SpendMandateDto>({
  id: s.string(),
  version: s.int(),
  status: status3Schema,
  currency: s.string(),
  weeklyBudgetMinor: s.int(),
  perOrderLimitMinor: s.int(),
  autoApprovalLimitMinor: s.int(),
  humanApprovalRequired: s.boolean(),
  approvedSupplierIds: s.array(s.string()),
  allowedCategories: s.array(s.lazy(() => productCategorySchema)),
  maxMarketPricePremiumPct: s.int(),
  marketPriceAction: marketPriceActionSchema,
  duplicateWindowHours: s.int(),
  duplicateAction: duplicateActionSchema,
  subscriptionsAllowed: s.boolean(),
  certificateTtlMinutes: s.int(),
  maxQuantityMultipleOfNeed: s.float64(),
  createdBy: s.string(),
  createdAt: s.string(),
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
    createdBy: "created_by",
    createdAt: "created_at",
  },
});
