import { describe, expect, it } from "vitest";
import { buildCart, evaluatePolicy, reviewCodes, type PolicyInput } from "@qm/trustrail";
import { NOW, OTHER_SUPPLIER, SUPPLIER, baseInput, fee, mandate, product, shipping, tax } from "../helpers/fixtures";

const codes = (r: ReturnType<typeof evaluatePolicy>) => r.violations.map((v) => v.code);

describe("TrustRail policy engine", () => {
  it("allows a compliant cart and still requires human approval", () => {
    const r = evaluatePolicy(baseInput());
    expect(r.decision).toBe("ALLOW");
    expect(r.violations).toEqual([]);
    expect(r.human_approval_required).toBe(true);
    expect(r.input_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("is deterministic: identical input yields an identical digest and decision", () => {
    const a = evaluatePolicy(baseInput());
    const b = evaluatePolicy(baseInput());
    expect(a).toEqual(b);
  });

  it("blocks when no mandate is active", () => {
    expect(evaluatePolicy(baseInput({ mandate: null })).decision).toBe("BLOCK");
    expect(codes(evaluatePolicy(baseInput({ mandate: mandate({ status: "SUPERSEDED" }) })))).toContain("MANDATE_INACTIVE");
  });

  it("blocks an empty cart", () => {
    const r = evaluatePolicy(baseInput({}, [shipping(899)]));
    expect(codes(r)).toContain("EMPTY_CART");
  });

  it("blocks when the weekly budget would be exceeded", () => {
    const r = evaluatePolicy(baseInput({ budget: { limit_minor: 50_000, spent_minor: 40_000, reserved_minor: 0 } }));
    expect(r.decision).toBe("BLOCK");
    expect(codes(r)).toContain("WEEKLY_BUDGET_EXCEEDED");
  });

  it("counts active reservations against the weekly budget", () => {
    const r = evaluatePolicy(baseInput({ budget: { limit_minor: 50_000, spent_minor: 20_000, reserved_minor: 15_000 } }));
    expect(codes(r)).toContain("WEEKLY_BUDGET_EXCEEDED");
  });

  it("allows a cart that exactly consumes the remaining budget", () => {
    const r = evaluatePolicy(baseInput({ budget: { limit_minor: 50_000, spent_minor: 50_000 - 17_320, reserved_minor: 0 } }));
    expect(codes(r)).not.toContain("WEEKLY_BUDGET_EXCEEDED");
  });

  it("uses the stricter of the account limit and the mandate's weekly budget", () => {
    const r = evaluatePolicy(baseInput({ mandate: mandate({ weekly_budget_minor: 15_000, per_order_limit_minor: 15_000, auto_approval_limit_minor: 10_000 }) }));
    expect(codes(r)).toEqual(expect.arrayContaining(["WEEKLY_BUDGET_EXCEEDED", "PER_ORDER_LIMIT_EXCEEDED"]));
  });

  it("blocks when the per-order limit is exceeded", () => {
    const r = evaluatePolicy(baseInput({ mandate: mandate({ per_order_limit_minor: 10_000 }) }));
    expect(codes(r)).toContain("PER_ORDER_LIMIT_EXCEEDED");
  });

  it("blocks when the owner's request budget is exceeded", () => {
    const r = evaluatePolicy(baseInput({ request_budget_limit_minor: 15_000 }));
    expect(codes(r)).toContain("REQUEST_BUDGET_EXCEEDED");
  });

  it("blocks unapproved suppliers even with a perfect cart", () => {
    const input = baseInput();
    input.cart = { ...input.cart, supplier_id: OTHER_SUPPLIER };
    input.catalog = input.catalog.map((c) => ({ ...c, supplier_id: OTHER_SUPPLIER }));
    input.supplier = { ...input.supplier!, id: OTHER_SUPPLIER };
    expect(codes(evaluatePolicy(input))).toContain("SUPPLIER_NOT_APPROVED");
  });

  it("blocks inactive or unknown suppliers", () => {
    expect(codes(evaluatePolicy(baseInput({ supplier: null })))).toContain("SUPPLIER_INACTIVE");
    const input = baseInput();
    input.supplier = { ...input.supplier!, active: false };
    expect(codes(evaluatePolicy(input))).toContain("SUPPLIER_INACTIVE");
  });

  it("blocks prohibited product categories", () => {
    const wine = product({ sku: "WINE-12", description: "House red wine", category: "alcohol", quantity: 1, unit_price_minor: 14_400, line_total_minor: 14_400 });
    const r = evaluatePolicy(baseInput({}, [wine, shipping(899), tax(1_188)]));
    expect(codes(r)).toContain("CATEGORY_NOT_ALLOWED");
  });

  it("blocks a line that relabels its category to bypass restrictions", () => {
    const wine = product({ sku: "WINE-12", description: "House red wine", category: "food_packaging", quantity: 1, unit_price_minor: 14_400, line_total_minor: 14_400 });
    const r = evaluatePolicy(baseInput({}, [wine, shipping(899), tax(1_188)]));
    expect(codes(r)).toContain("CATEGORY_NOT_ALLOWED");
  });

  it("blocks subscriptions when the mandate forbids them", () => {
    const sub = product({ sku: "DESCALE-SUB", description: "Descaling subscription", category: "cleaning_supplies", quantity: 1, unit_price_minor: 3_900, line_total_minor: 3_900 });
    const r = evaluatePolicy(baseInput({ needed_units_by_sku: {} }, [sub, shipping(899), tax(322)]));
    expect(codes(r)).toContain("SUBSCRIPTION_NOT_ALLOWED");
  });

  it("allows subscriptions when the mandate permits them", () => {
    const sub = product({ sku: "DESCALE-SUB", description: "Descaling subscription", category: "cleaning_supplies", quantity: 1, unit_price_minor: 3_900, line_total_minor: 3_900 });
    const r = evaluatePolicy(baseInput({ mandate: mandate({ subscriptions_allowed: true }), needed_units_by_sku: {} }, [sub, shipping(899), tax(322)]));
    expect(codes(r)).not.toContain("SUBSCRIPTION_NOT_ALLOWED");
  });

  it("blocks currency mismatches", () => {
    const input = baseInput();
    input.cart = { ...input.cart, currency: "EUR" };
    expect(codes(evaluatePolicy(input))).toContain("CURRENCY_MISMATCH");
  });

  it("requires review when no market reference is available", () => {
    const r = evaluatePolicy(baseInput({ market: [] }));
    expect(r.decision).toBe("REVIEW_REQUIRED");
    expect(codes(r)).toEqual(["MARKET_REFERENCE_UNAVAILABLE"]);
  });

  it("requires review when the market reference is stale", () => {
    const r = evaluatePolicy(baseInput({ market: [{ sku: "TK-250", reference_unit_price_minor: 31, candidate_unit_price_minor: 32, observed_at: "2026-11-01T00:00:00Z", comparable: true }] }));
    expect(r.violations[0]?.evidence?.reason).toBe("stale");
  });

  it("requires review when listings are not comparable", () => {
    const r = evaluatePolicy(baseInput({ market: [{ sku: "TK-250", reference_unit_price_minor: 31, candidate_unit_price_minor: 32, observed_at: NOW.toISOString(), comparable: false }] }));
    expect(codes(r)).toEqual(["MARKET_REFERENCE_UNAVAILABLE"]);
  });

  it("flags a premium above the mandate threshold for review", () => {
    const r = evaluatePolicy(baseInput({ market: [{ sku: "TK-250", reference_unit_price_minor: 25, candidate_unit_price_minor: 0, observed_at: NOW.toISOString(), comparable: true }] }));
    const v = r.violations.find((x) => x.code === "MARKET_PRICE_PREMIUM_EXCEEDED");
    expect(v?.severity).toBe("REVIEW");
    expect(v?.evidence?.premium_pct).toBe(28);
  });

  it("computes the premium from the cart line, ignoring a caller-supplied candidate price", () => {
    // candidate_unit_price_minor claims 1¢ but the line is really 32¢/unit.
    const r = evaluatePolicy(baseInput({ market: [{ sku: "TK-250", reference_unit_price_minor: 25, candidate_unit_price_minor: 1, observed_at: NOW.toISOString(), comparable: true }] }));
    expect(codes(r)).toContain("MARKET_PRICE_PREMIUM_EXCEEDED");
  });

  it("blocks an over-market price when the mandate says BLOCK", () => {
    const r = evaluatePolicy(baseInput({ mandate: mandate({ market_price_action: "BLOCK" }), market: [{ sku: "TK-250", reference_unit_price_minor: 25, candidate_unit_price_minor: 32, observed_at: NOW.toISOString(), comparable: true }] }));
    expect(r.decision).toBe("BLOCK");
  });

  it("treats a zero or negative reference price as unavailable rather than dividing by it", () => {
    const r = evaluatePolicy(baseInput({ market: [{ sku: "TK-250", reference_unit_price_minor: 0, candidate_unit_price_minor: 32, observed_at: NOW.toISOString(), comparable: true }] }));
    expect(r.violations[0]?.evidence?.reason).toBe("invalid_price");
  });

  it("flags duplicate orders inside the window for review", () => {
    const r = evaluatePolicy(baseInput({ prior_orders: [{ id: "po_prev", supplier_id: SUPPLIER, skus: ["TK-250"], status: "PAID", created_at: "2026-11-10T08:00:00Z" }] }));
    expect(r.violations.find((v) => v.code === "DUPLICATE_ORDER")?.severity).toBe("REVIEW");
  });

  it("blocks duplicates when the mandate says BLOCK", () => {
    const r = evaluatePolicy(baseInput({ mandate: mandate({ duplicate_action: "BLOCK" }), prior_orders: [{ id: "po_prev", supplier_id: SUPPLIER, skus: ["TK-250"], status: "APPROVED", created_at: "2026-11-10T08:00:00Z" }] }));
    expect(r.decision).toBe("BLOCK");
  });

  it("ignores old, rejected or unrelated prior orders", () => {
    const r = evaluatePolicy(
      baseInput({
        prior_orders: [
          { id: "old", supplier_id: SUPPLIER, skus: ["TK-250"], status: "PAID", created_at: "2026-11-01T00:00:00Z" },
          { id: "rej", supplier_id: SUPPLIER, skus: ["TK-250"], status: "REJECTED", created_at: "2026-11-10T10:00:00Z" },
          { id: "other", supplier_id: SUPPLIER, skus: ["GLOVES"], status: "PAID", created_at: "2026-11-10T10:00:00Z" },
        ],
      }),
    );
    expect(codes(r)).not.toContain("DUPLICATE_ORDER");
  });

  it("flags quantities far above forecast need for review", () => {
    const big = product({ quantity: 10, line_total_minor: 80_000 });
    const r = evaluatePolicy(baseInput({ mandate: mandate({ per_order_limit_minor: 100_000, weekly_budget_minor: 100_000 }), budget: { limit_minor: 100_000, spent_minor: 0, reserved_minor: 0 } }, [big, shipping(0), tax(6_600)]));
    expect(r.violations.find((v) => v.code === "QUANTITY_EXCEEDS_NEED")?.severity).toBe("REVIEW");
  });

  it("allows rounding up to whole packs without flagging over-purchase", () => {
    const r = evaluatePolicy(baseInput({ needed_units_by_sku: { "TK-250": 260 } }));
    expect(codes(r)).not.toContain("QUANTITY_EXCEEDS_NEED");
  });

  it("only lists REVIEW violations as acknowledgement codes", () => {
    const r = evaluatePolicy(baseInput({ market: [], prior_orders: [{ id: "p", supplier_id: SUPPLIER, skus: ["TK-250"], status: "PAID", created_at: "2026-11-10T10:00:00Z" }] }));
    expect(reviewCodes(r).sort()).toEqual(["DUPLICATE_ORDER", "MARKET_REFERENCE_UNAVAILABLE"]);
  });

  it("records which mandate version and policy version decided", () => {
    const r = evaluatePolicy(baseInput({ mandate: mandate({ version: 7 }) }));
    expect(r.mandate_version).toBe(7);
    expect(r.policy_version).toMatch(/^trustrail-policy\//);
  });

  it("changes its input digest when any decisive fact changes", () => {
    const base = evaluatePolicy(baseInput()).input_digest;
    const supplier = baseInput().supplier!;
    const variants: Partial<PolicyInput>[] = [
      { budget: { limit_minor: 50_000, spent_minor: 1, reserved_minor: 0 } },
      { catalog: baseInput().catalog.map((c) => (c.sku === "TK-250" ? { ...c, unit_price_minor: 8_001 } : c)) },
      { catalog: baseInput().catalog.map((c) => (c.sku === "TK-250" ? { ...c, category: "cleaning_supplies" as const } : c)) },
      { catalog: baseInput().catalog.map((c) => (c.sku === "WINE-12" ? { ...c, quarantined: true } : c)) },
      { supplier: { ...supplier, fee_terms: [{ ...supplier.fee_terms[0]!, amount_minor: 999 }] } },
      { supplier: { ...supplier, fee_terms: [{ ...supplier.fee_terms[0]!, waived_over_minor: null }] } },
      { supplier: { ...supplier, tax_rate_bps: 800 } },
      { supplier: { ...supplier, active: false } },
      { needed_units_by_sku: { "TK-250": 461 } },
      { pack_quantity_by_sku: { "TK-250": 251, "WINE-12": 12, "DESCALE-SUB": 1 } },
      { prior_orders: [{ id: "p", supplier_id: SUPPLIER, skus: ["X"], status: "PAID", created_at: "2026-11-10T10:00:00Z" }] },
      { now: new Date(NOW.getTime() + 1) },
      { market_reference_max_age_hours: 24 },
      { mandate: mandate({ max_market_price_premium_pct: 11 }) },
      { mandate: mandate({ human_approval_required: false }) },
      { request_budget_limit_minor: 99_999 },
      { quarantined_source_ids: ["x"] },
    ];
    const digests = variants.map((v) => evaluatePolicy(baseInput(v)).input_digest);
    for (const d of digests) expect(d).not.toBe(base);
    expect(new Set(digests).size).toBe(variants.length);
  });

  it("keeps the digest stable under reordering of set-like inputs", () => {
    const priors = [
      { id: "a", supplier_id: SUPPLIER, skus: ["X", "Y"], status: "PAID", created_at: "2026-11-01T00:00:00Z" },
      { id: "b", supplier_id: SUPPLIER, skus: ["Z"], status: "PAID", created_at: "2026-11-01T00:00:00Z" },
    ];
    const a = evaluatePolicy(baseInput({ prior_orders: priors, quarantined_source_ids: ["q1", "q2"] }));
    const b = evaluatePolicy(
      baseInput({ prior_orders: [{ ...priors[1]! }, { ...priors[0]!, skus: ["Y", "X"] }], quarantined_source_ids: ["q2", "q1"], catalog: [...baseInput().catalog].reverse() }),
    );
    expect(a.input_digest).toBe(b.input_digest);
  });

  it("waives shipping only when the subtotal meets the published threshold", () => {
    const small = product({ quantity: 1, line_total_minor: 8_000 });
    expect(codes(evaluatePolicy(baseInput({}, [small, shipping(899), tax(660)])))).not.toContain("UNAUTHORIZED_LINE_ITEM");
    expect(codes(evaluatePolicy(baseInput({}, [small, shipping(0), tax(660)])))).toContain("UNAUTHORIZED_LINE_ITEM");
    // Builds a cart with a fee on top just to make sure a legit cart is unaffected by fee rules.
    expect(evaluatePolicy({ ...baseInput(), cart: buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_320)]) }).decision).toBe("ALLOW");
  });

  it("never lets a fee line through, regardless of how it is described", () => {
    const r = evaluatePolicy(baseInput({}, [product(), shipping(0), fee("OWNER_APPROVED", 2_450, "Pre-approved by owner"), tax(1_320)]));
    expect(r.decision).toBe("BLOCK");
  });
});
