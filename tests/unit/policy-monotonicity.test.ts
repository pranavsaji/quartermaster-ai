import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyBps } from "@qm/contracts";
import { buildCart, evaluatePolicy, type CartLine, type CatalogEntry, type PolicyInput } from "@qm/trustrail";
import { mandate, NOW, SUPPLIER } from "../helpers/fixtures";

/**
 * Monotonicity of TrustRail decisions: making a cart strictly "more" — another product line, or a
 * higher (catalog-confirmed) price — never turns a BLOCK or REVIEW_REQUIRED into an ALLOW.
 *
 * Carts are rebuilt with their published charges after every change, exactly as the quote builder
 * does, so the property is about the purchase rather than about a stale tax line. Shipping has
 * no free-shipping threshold here: a waiver legitimately makes the total non-monotone in the
 * subtotal ($149 + $8.99 shipping costs more than $150 with free shipping), so a cheaper cart
 * that newly qualifies is evaluated on its own, lower, total.
 */
const SKUS = ["P-10", "P-25", "P-50", "WINE-12", "SUB-1"] as const;
const CATEGORY: Record<(typeof SKUS)[number], CatalogEntry["category"]> = {
  "P-10": "food_packaging",
  "P-25": "cleaning_supplies",
  "P-50": "cooking_ingredients",
  "WINE-12": "alcohol",
  "SUB-1": "cleaning_supplies",
};
const PACK: Record<(typeof SKUS)[number], number> = { "P-10": 10, "P-25": 25, "P-50": 50, "WINE-12": 12, "SUB-1": 1 };

interface Scenario {
  prices: Record<string, number>;
  quantities: Record<string, number>;
  inCart: string[];
  taxBps: number;
  shipping: number;
  input: Omit<PolicyInput, "cart" | "catalog" | "supplier">;
}

function cartLines(s: Scenario): CartLine[] {
  const products: CartLine[] = s.inCart.map((sku) => ({
    kind: "PRODUCT",
    sku,
    description: sku,
    category: CATEGORY[sku as (typeof SKUS)[number]],
    quantity: s.quantities[sku]!,
    unit_price_minor: s.prices[sku]!,
    line_total_minor: s.quantities[sku]! * s.prices[sku]!,
  }));
  const subtotal = products.reduce((a, l) => a + l.line_total_minor, 0);
  const charge = (kind: CartLine["kind"], sku: string | null, amount: number): CartLine => ({
    kind,
    sku,
    description: kind,
    category: null,
    quantity: 1,
    unit_price_minor: amount,
    line_total_minor: amount,
  });
  return [
    ...products,
    charge("SHIPPING", "SHIP", s.shipping),
    ...(s.taxBps > 0 ? [charge("TAX", null, applyBps(subtotal, s.taxBps))] : []),
  ];
}

function toInput(s: Scenario): PolicyInput {
  return {
    ...s.input,
    cart: buildCart(SUPPLIER, "USD", cartLines(s)),
    supplier: {
      id: SUPPLIER,
      active: true,
      tax_rate_bps: s.taxBps,
      fee_terms: [{ code: "SHIP", kind: "SHIPPING", amount_minor: s.shipping, waived_over_minor: null }],
    },
    catalog: SKUS.map((sku) => ({
      sku,
      supplier_id: SUPPLIER,
      category: CATEGORY[sku],
      unit_price_minor: s.prices[sku]!,
      recurring: sku === "SUB-1",
      quarantined: false,
    })),
  };
}

const priceArb = fc.integer({ min: 1, max: 20_000 });
const scenario: fc.Arbitrary<Scenario> = fc
  .record({
    prices: fc.record(Object.fromEntries(SKUS.map((s) => [s, priceArb])) as Record<(typeof SKUS)[number], typeof priceArb>),
    quantities: fc.record(
      Object.fromEntries(SKUS.map((s) => [s, fc.integer({ min: 1, max: 12 })])) as Record<(typeof SKUS)[number], fc.Arbitrary<number>>,
    ),
    inCart: fc.subarray([...SKUS], { minLength: 1, maxLength: SKUS.length - 1 }),
    taxBps: fc.constantFrom(0, 825, 1_000),
    shipping: fc.constantFrom(0, 899),
    weekly: fc.integer({ min: 0, max: 200_000 }),
    perOrder: fc.integer({ min: 0, max: 200_000 }),
    spent: fc.integer({ min: 0, max: 50_000 }),
    requestLimit: fc.option(fc.integer({ min: 0, max: 200_000 })),
    premiumPct: fc.integer({ min: 0, max: 50 }),
    marketAction: fc.constantFrom("REVIEW" as const, "BLOCK" as const),
    multiple: fc.constantFrom(1, 1.5, 2, 4),
    subscriptions: fc.boolean(),
    needs: fc.dictionary(fc.constantFrom(...SKUS), fc.integer({ min: 0, max: 600 })),
    refs: fc.dictionary(fc.constantFrom(...SKUS), fc.double({ min: 0.5, max: 3_000, noNaN: true })),
    priorSkus: fc.subarray([...SKUS]),
  })
  .map((g): Scenario => ({
    prices: g.prices,
    quantities: g.quantities,
    inCart: g.inCart,
    taxBps: g.taxBps,
    shipping: g.shipping,
    input: {
      mandate: mandate({
        weekly_budget_minor: g.weekly,
        per_order_limit_minor: g.perOrder,
        auto_approval_limit_minor: 0,
        max_market_price_premium_pct: g.premiumPct,
        market_price_action: g.marketAction,
        max_quantity_multiple_of_need: g.multiple,
        subscriptions_allowed: g.subscriptions,
      }),
      budget: { limit_minor: g.weekly, spent_minor: g.spent, reserved_minor: 0 },
      request_budget_limit_minor: g.requestLimit,
      needed_units_by_sku: g.needs,
      pack_quantity_by_sku: PACK,
      market: Object.entries(g.refs).map(([sku, ref]) => ({
        sku,
        reference_unit_price_minor: ref,
        candidate_unit_price_minor: 0,
        observed_at: "2026-11-10T12:00:00Z",
        comparable: true,
      })),
      prior_orders: g.priorSkus.length
        ? [{ id: "po_prior", supplier_id: SUPPLIER, skus: g.priorSkus, status: "PAID", created_at: "2026-11-10T08:00:00Z" }]
        : [],
      quarantined_source_ids: [],
      now: NOW,
    },
  }));

const RUNS = { numRuns: 400 };

describe("property: policy decisions are monotone", () => {
  it("adding a product line never turns BLOCK or REVIEW into ALLOW", () => {
    fc.assert(
      fc.property(scenario, fc.nat(), (s, pick) => {
        const before = evaluatePolicy(toInput(s));
        const missing = SKUS.filter((sku) => !s.inCart.includes(sku));
        const added: Scenario = { ...s, inCart: [...s.inCart, missing[pick % missing.length]!] };
        const after = evaluatePolicy(toInput(added));
        if (before.decision !== "ALLOW") expect(after.decision, JSON.stringify(after.violations)).not.toBe("ALLOW");
      }),
      RUNS,
    );
  });

  it("raising a price (catalog and cart alike) never turns BLOCK or REVIEW into ALLOW", () => {
    fc.assert(
      fc.property(scenario, fc.nat(), fc.integer({ min: 1, max: 10_000 }), (s, pick, delta) => {
        const before = evaluatePolicy(toInput(s));
        const sku = s.inCart[pick % s.inCart.length]!;
        const raised: Scenario = { ...s, prices: { ...s.prices, [sku]: s.prices[sku]! + delta } };
        const after = evaluatePolicy(toInput(raised));
        if (before.decision !== "ALLOW") expect(after.decision, JSON.stringify(after.violations)).not.toBe("ALLOW");
      }),
      RUNS,
    );
  });

  it("the generator reaches every decision, so the properties are not vacuous", () => {
    const seen = new Set(fc.sample(scenario, { numRuns: 600, seed: 42 }).map((s) => evaluatePolicy(toInput(s)).decision));
    expect([...seen].sort()).toEqual(["ALLOW", "BLOCK", "REVIEW_REQUIRED"]);
  });
});
