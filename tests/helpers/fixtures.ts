import { buildCart, type CartLine, type PolicyInput, type SpendMandate } from "@qm/trustrail";

export const SUPPLIER = "11111111-1111-4111-8111-111111111111";
export const OTHER_SUPPLIER = "22222222-2222-4222-8222-222222222222";
export const NOW = new Date("2026-11-10T18:00:00Z");

export function mandate(overrides: Partial<SpendMandate> = {}): SpendMandate {
  return {
    id: "mandate_1",
    organization_id: "org_1",
    version: 1,
    status: "ACTIVE",
    currency: "USD",
    weekly_budget_minor: 50_000,
    per_order_limit_minor: 25_000,
    auto_approval_limit_minor: 10_000,
    human_approval_required: true,
    approved_supplier_ids: [SUPPLIER],
    allowed_categories: ["food_packaging", "cleaning_supplies", "cooking_ingredients"],
    max_market_price_premium_pct: 10,
    market_price_action: "REVIEW",
    duplicate_window_hours: 24,
    duplicate_action: "REVIEW",
    subscriptions_allowed: false,
    certificate_ttl_minutes: 30,
    max_quantity_multiple_of_need: 2,
    ...overrides,
  };
}

export const product = (overrides: Partial<CartLine> = {}): CartLine => ({
  kind: "PRODUCT",
  sku: "TK-250",
  description: "Takeout containers, case of 250",
  category: "food_packaging",
  quantity: 2,
  unit_price_minor: 8_000,
  line_total_minor: 16_000,
  ...overrides,
});

export const shipping = (amount = 0): CartLine => ({
  kind: "SHIPPING",
  sku: "SHIP_STD",
  description: "Standard delivery",
  category: null,
  quantity: 1,
  unit_price_minor: amount,
  line_total_minor: amount,
});

export const tax = (amount: number): CartLine => ({ kind: "TAX", sku: null, description: "Sales tax", category: null, quantity: 1, unit_price_minor: amount, line_total_minor: amount });

export const fee = (code: string, amount: number, description = "Service charge"): CartLine => ({
  kind: "FEE",
  sku: code,
  description,
  category: null,
  quantity: 1,
  unit_price_minor: amount,
  line_total_minor: amount,
});

/** A compliant baseline: 2 × 250 containers at $80, free shipping over $150, 8.25% tax. */
export function baseInput(overrides: Partial<PolicyInput> = {}, lines?: CartLine[]): PolicyInput {
  const cartLines = lines ?? [product(), shipping(0), tax(1_320)];
  return {
    mandate: mandate(),
    cart: buildCart(SUPPLIER, "USD", cartLines),
    supplier: {
      id: SUPPLIER,
      active: true,
      tax_rate_bps: 825,
      fee_terms: [{ code: "SHIP_STD", kind: "SHIPPING", amount_minor: 899, waived_over_minor: 15_000 }],
    },
    catalog: [
      { sku: "TK-250", supplier_id: SUPPLIER, category: "food_packaging", unit_price_minor: 8_000, recurring: false, quarantined: false },
      { sku: "WINE-12", supplier_id: SUPPLIER, category: "alcohol", unit_price_minor: 14_400, recurring: false, quarantined: false },
      { sku: "DESCALE-SUB", supplier_id: SUPPLIER, category: "cleaning_supplies", unit_price_minor: 3_900, recurring: true, quarantined: false },
    ],
    budget: { limit_minor: 50_000, spent_minor: 0, reserved_minor: 0 },
    request_budget_limit_minor: null,
    needed_units_by_sku: { "TK-250": 460 },
    pack_quantity_by_sku: { "TK-250": 250, "WINE-12": 12, "DESCALE-SUB": 1 },
    market: [{ sku: "TK-250", reference_unit_price_minor: 31, candidate_unit_price_minor: 32, observed_at: "2026-11-10T12:00:00Z", comparable: true }],
    prior_orders: [],
    quarantined_source_ids: [],
    now: NOW,
    ...overrides,
  };
}
