import { describe, expect, it } from "vitest";
import { applyBps } from "@qm/contracts";
import { buildCart, evaluatePolicy, type PolicyInput } from "@qm/trustrail";
import { buildSupplierQuote } from "@qm/quartermaster";
import { SUPPLIER, baseInput, product, shipping, tax } from "../helpers/fixtures";

const codes = (r: ReturnType<typeof evaluatePolicy>) => r.violations.map((v) => v.code);
const withSupplier = (patch: Partial<NonNullable<PolicyInput["supplier"]>>, lines = [product(), shipping(0), tax(1_320)]) => {
  const input = baseInput({}, lines);
  input.supplier = { ...input.supplier!, ...patch };
  return input;
};

describe("policy engine — supplier binding", () => {
  it("blocks when the supplier terms belong to a different supplier than the cart", () => {
    const r = evaluatePolicy(withSupplier({ id: "33333333-3333-4333-8333-333333333333" }));
    expect(r.decision).toBe("BLOCK");
    expect(r.violations.find((v) => v.code === "SUPPLIER_INACTIVE")).toMatchObject({
      message: "Supplier terms provided do not belong to the cart's supplier.",
      evidence: { cart_supplier_id: SUPPLIER, terms_supplier_id: "33333333-3333-4333-8333-333333333333" },
    });
  });
});

describe("policy engine — pack quantities", () => {
  const big = () => baseInput({ needed_units_by_sku: { "TK-250": 10 } }); // 2 packs × 250 ≫ 10 × 2

  it("flags over-purchase with a valid pack size", () => {
    expect(codes(evaluatePolicy(big()))).toContain("QUANTITY_EXCEEDS_NEED");
  });

  it.each([0, -250, Number.NaN, Number.POSITIVE_INFINITY, 2.5])("treats pack size %s as invalid in both the quantity and market checks", (pack) => {
    const r = evaluatePolicy({ ...big(), pack_quantity_by_sku: { "TK-250": pack } });
    const qty = r.violations.find((v) => v.code === "QUANTITY_EXCEEDS_NEED");
    expect(qty).toMatchObject({ severity: "REVIEW", evidence: { reason: "invalid_pack_quantity" } });
    expect(r.violations.find((v) => v.code === "MARKET_REFERENCE_UNAVAILABLE")).toMatchObject({ evidence: { reason: "invalid_pack_quantity" } });
    expect(r.decision).toBe("REVIEW_REQUIRED");
  });

  it("flags an invalid pack size even when no forecast need is known", () => {
    const r = evaluatePolicy(baseInput({ needed_units_by_sku: {}, pack_quantity_by_sku: { "TK-250": 0 } }));
    expect(r.violations.find((v) => v.code === "QUANTITY_EXCEEDS_NEED")?.evidence?.reason).toBe("invalid_pack_quantity");
  });

  it("flags a malformed forecast need for review", () => {
    const r = evaluatePolicy(baseInput({ needed_units_by_sku: { "TK-250": Number.NaN } }));
    expect(r.violations.find((v) => v.code === "QUANTITY_EXCEEDS_NEED")?.evidence?.reason).toBe("invalid_need");
  });

  it("defaults an absent pack size to 1 and ignores inherited properties", () => {
    const line = product({ sku: "constructor", quantity: 1, unit_price_minor: 8_000, line_total_minor: 8_000 });
    const input = baseInput({ needed_units_by_sku: {}, pack_quantity_by_sku: {} }, [line, shipping(899), tax(660)]);
    input.catalog = [{ sku: "constructor", supplier_id: SUPPLIER, category: "food_packaging", unit_price_minor: 8_000, recurring: false, quarantined: false }];
    input.market = [];
    const r = evaluatePolicy(input);
    expect(r.violations.filter((v) => v.code === "QUANTITY_EXCEEDS_NEED")).toEqual([]);
  });
});

describe("policy engine — timestamps", () => {
  const ref = (observed_at: string | null) => [{ sku: "TK-250", reference_unit_price_minor: 31, candidate_unit_price_minor: 32, observed_at, comparable: true }];
  const marketReason = (r: ReturnType<typeof evaluatePolicy>) => r.violations.find((v) => v.code === "MARKET_REFERENCE_UNAVAILABLE")?.evidence?.reason;

  it("does not treat a future market observation as fresh forever", () => {
    expect(marketReason(evaluatePolicy(baseInput({ market: ref("2027-01-01T00:00:00Z") })))).toBe("future_observation");
    expect(marketReason(evaluatePolicy(baseInput({ market: ref("2026-11-10T18:06:00Z") })))).toBe("future_observation");
  });

  it("tolerates a small clock skew", () => {
    expect(marketReason(evaluatePolicy(baseInput({ market: ref("2026-11-10T18:04:00Z") })))).toBeUndefined();
  });

  it("treats an unparseable observation time as stale", () => {
    expect(marketReason(evaluatePolicy(baseInput({ market: ref("not a date") })))).toBe("stale");
  });

  it("counts a prior order with an unparseable created_at as inside the duplicate window", () => {
    const r = evaluatePolicy(baseInput({ prior_orders: [{ id: "po_x", supplier_id: SUPPLIER, skus: ["TK-250"], status: "PAID", created_at: "garbage" }] }));
    expect(r.violations.find((v) => v.code === "DUPLICATE_ORDER")?.evidence).toEqual({ purchase_order_ids: ["po_x"] });
  });
});

describe("policy engine — tax rounding", () => {
  it("expects exactly the tax that quote building charges (one shared rounding helper)", () => {
    // 10_806 × 8.25 % = 891.495 → 891 under half-up on the exact product.
    for (const subtotal of [1, 6, 10_806, 16_000, 33_333, 99_999]) {
      const expected = applyBps(subtotal, 825);
      const cart = buildCart(SUPPLIER, "USD", [product({ quantity: 1, unit_price_minor: subtotal, line_total_minor: subtotal }), shipping(subtotal >= 15_000 ? 0 : 899), tax(expected)]);
      const input = baseInput({ cart, catalog: [{ sku: "TK-250", supplier_id: SUPPLIER, category: "food_packaging", unit_price_minor: subtotal, recurring: false, quarantined: false }] });
      expect(codes(evaluatePolicy(input))).not.toContain("UNAUTHORIZED_LINE_ITEM");
      const quote = buildSupplierQuote(
        { id: SUPPLIER, name: "s", approved: true, active: true, checkout_eligible: true, lead_time_days: 1, tax_rate_bps: 825, fee_terms: [] },
        [{ offer: { id: "o", supplier_id: SUPPLIER, sku: "TK-250", title: "t", description: "", category: "food_packaging", inventory_item_id: null, pack_quantity: 1, unit_price_minor: subtotal, currency: "USD", in_stock: true, recurring: false }, packs: 1 }],
        "USD",
      );
      expect(quote.tax_minor).toBe(expected);
    }
  });

  it.each([Number.NaN, 8.25, -1, 10_001, Number.POSITIVE_INFINITY])("blocks a supplier whose tax rate is malformed (%s)", (bps) => {
    const r = evaluatePolicy(withSupplier({ tax_rate_bps: bps }));
    expect(r.decision).toBe("BLOCK");
    expect(r.violations.find((v) => v.code === "SUPPLIER_INACTIVE")?.message).toMatch(/tax rate is malformed/);
    expect(codes(r)).toContain("UNAUTHORIZED_LINE_ITEM");
  });
});
