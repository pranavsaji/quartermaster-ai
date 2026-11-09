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
