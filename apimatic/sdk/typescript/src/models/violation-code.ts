import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Machine-readable TrustRail policy violation. */
export const ViolationCode = {
  MandateInactive: "MANDATE_INACTIVE",
  EmptyCart: "EMPTY_CART",
  CurrencyMismatch: "CURRENCY_MISMATCH",
  SupplierNotApproved: "SUPPLIER_NOT_APPROVED",
  SupplierInactive: "SUPPLIER_INACTIVE",
  CategoryNotAllowed: "CATEGORY_NOT_ALLOWED",
  UnauthorizedLineItem: "UNAUTHORIZED_LINE_ITEM",
  PriceMismatch: "PRICE_MISMATCH",
  CartArithmeticInvalid: "CART_ARITHMETIC_INVALID",
  PerOrderLimitExceeded: "PER_ORDER_LIMIT_EXCEEDED",
  WeeklyBudgetExceeded: "WEEKLY_BUDGET_EXCEEDED",
  RequestBudgetExceeded: "REQUEST_BUDGET_EXCEEDED",
  MarketPricePremiumExceeded: "MARKET_PRICE_PREMIUM_EXCEEDED",
  MarketReferenceUnavailable: "MARKET_REFERENCE_UNAVAILABLE",
  DuplicateOrder: "DUPLICATE_ORDER",
  SubscriptionNotAllowed: "SUBSCRIPTION_NOT_ALLOWED",
  QuarantinedSource: "QUARANTINED_SOURCE",
  QuantityExceedsNeed: "QUANTITY_EXCEEDS_NEED",
  PolicyInputInvalid: "POLICY_INPUT_INVALID",
} as const;
export type ViolationCode = (typeof ViolationCode)[keyof typeof ViolationCode] | (string & {});

export const violationCodeSchema: EnumSchema<ViolationCode> = s.enumOf<ViolationCode>(ViolationCode);
