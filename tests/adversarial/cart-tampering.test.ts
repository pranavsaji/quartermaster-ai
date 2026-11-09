import { describe, expect, it } from "vitest";
import { buildCart, checkCartArithmetic, computeCartHash, evaluatePolicy, type Cart } from "@qm/trustrail";
import { SUPPLIER, baseInput, fee, product, shipping, tax } from "../helpers/fixtures";

const codes = (c: Cart) => evaluatePolicy({ ...baseInput(), cart: c }).violations.map((v) => v.code);
/** Asserts a BLOCK caused by `code` with a message matching `message`, and returns the violation. */
const blockedBy = (c: Cart, code: string, message: RegExp) => {
  const r = evaluatePolicy({ ...baseInput(), cart: c });
  expect(r.decision).toBe("BLOCK");
  const v = r.violations.find((x) => x.code === code && message.test(x.message));
  expect(v, `${code} ${message} in ${JSON.stringify(r.violations.map((x) => [x.code, x.message]))}`).toBeDefined();
  expect(v!.severity).toBe("BLOCK");
  return v!;
};

describe("cart tampering and fee smuggling", () => {
  it("blocks an undisclosed service charge", () => {
    const c = buildCart(SUPPLIER, "USD", [product(), shipping(0), fee("PRIORITY_SVC", 2_450), tax(1_320)]);
    expect(blockedBy(c, "UNAUTHORIZED_LINE_ITEM", /not part of the supplier's published terms/).evidence).toMatchObject({
      code: "PRIORITY_SVC",
      amount_minor: 2_450,
    });
  });

  it("blocks a published fee code applied twice", () => {
    const c = buildCart(SUPPLIER, "USD", [product({ quantity: 1, line_total_minor: 8_000 }), shipping(899), shipping(899), tax(660)]);
    expect(blockedBy(c, "UNAUTHORIZED_LINE_ITEM", /applied more than once/).evidence).toEqual({ code: "SHIP_STD", kind: "SHIPPING" });
  });

  it("blocks a published fee charged at an inflated amount", () => {
    const c = buildCart(SUPPLIER, "USD", [product({ quantity: 1, line_total_minor: 8_000 }), shipping(1_999), tax(660)]);
    expect(blockedBy(c, "UNAUTHORIZED_LINE_ITEM", /does not match the published amount/).evidence).toEqual({
      code: "SHIP_STD",
      expected_minor: 899,
      cart_minor: 1_999,
    });
  });

  it("blocks shipping charged when it should have been waived", () => {
    const c = buildCart(SUPPLIER, "USD", [product(), shipping(899), tax(1_320)]);
    expect(blockedBy(c, "UNAUTHORIZED_LINE_ITEM", /does not match the published amount/).evidence).toEqual({
      code: "SHIP_STD",
      expected_minor: 0,
      cart_minor: 899,
    });
  });

  it("blocks an inflated tax line", () => {
    const v = blockedBy(buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(2_000)]), "UNAUTHORIZED_LINE_ITEM", /published tax rate/);
    expect(v.evidence).toEqual({ expected_minor: 1_320, cart_minor: 2_000 });
  });

  it("blocks a second tax line", () => {
    blockedBy(buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_320), tax(1)]), "UNAUTHORIZED_LINE_ITEM", /more than one tax line/);
  });

  it("blocks a product whose price differs from the verified catalog", () => {
    const c = buildCart(SUPPLIER, "USD", [product({ unit_price_minor: 9_000, line_total_minor: 18_000 }), shipping(0), tax(1_485)]);
    expect(codes(c)).toContain("PRICE_MISMATCH");
  });

  it("blocks a product that is not in the supplier's catalog", () => {
    const c = buildCart(SUPPLIER, "USD", [
      product(),
      product({
        sku: "GIFT-CARD",
        description: "Gift card",
        category: "food_packaging",
        quantity: 1,
        unit_price_minor: 5_000,
        line_total_minor: 5_000,
      }),
      shipping(0),
      tax(1_733),
    ]);
    expect(codes(c)).toContain("UNAUTHORIZED_LINE_ITEM");
  });

  it("blocks the same SKU split across two lines", () => {
    const c = buildCart(SUPPLIER, "USD", [
      product({ quantity: 1, line_total_minor: 8_000 }),
      product({ quantity: 1, line_total_minor: 8_000 }),
      shipping(0),
      tax(1_320),
    ]);
    expect(blockedBy(c, "UNAUTHORIZED_LINE_ITEM", /appears on more than one line/).evidence).toEqual({ sku: "TK-250" });
  });

  it("blocks a cart whose stated totals do not add up", () => {
    const good = buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_320)]);
    const forged: Cart = { ...good, total_minor: good.total_minor - 5_000 };
    expect(checkCartArithmetic(forged).length).toBeGreaterThan(0);
    expect(codes(forged)).toContain("CART_ARITHMETIC_INVALID");
  });

  it("blocks a line whose total disagrees with quantity × unit price", () => {
    const c = buildCart(SUPPLIER, "USD", [product({ line_total_minor: 1_000 }), shipping(0), tax(83)]);
    expect(codes(c)).toContain("CART_ARITHMETIC_INVALID");
  });

  it("rejects negative or fractional quantities", () => {
    expect(checkCartArithmetic(buildCart(SUPPLIER, "USD", [product({ quantity: -2, line_total_minor: -16_000 })])).length).toBeGreaterThan(
      0,
    );
    expect(checkCartArithmetic(buildCart(SUPPLIER, "USD", [product({ quantity: 1.5, line_total_minor: 12_000 })])).length).toBeGreaterThan(
      0,
    );
  });

  it("rejects unknown line kinds that would be dropped from totals", () => {
    const c = buildCart(SUPPLIER, "USD", [product(), { ...fee("X", 500), kind: "DISCOUNT" as never }]);
    expect(checkCartArithmetic(c).some((i) => i.path.endsWith(".kind"))).toBe(true);
  });

  it("rejects a non-boolean recurring flag", () => {
    const c = buildCart(SUPPLIER, "USD", [product({ recurring: "yes" as never })]);
    expect(checkCartArithmetic(c).some((i) => i.path.endsWith(".recurring"))).toBe(true);
  });

  it("changes the cart hash for any change to amounts, quantities, descriptions or order", () => {
    const base = buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_320)]);
    const h = computeCartHash(base);
    const variants: Cart[] = [
      buildCart(SUPPLIER, "USD", [product({ quantity: 3, line_total_minor: 24_000 }), shipping(0), tax(1_980)]),
      buildCart(SUPPLIER, "USD", [product({ description: "Renamed" }), shipping(0), tax(1_320)]),
      buildCart(SUPPLIER, "USD", [shipping(0), product(), tax(1_320)]),
      buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_321)]),
      { ...base, currency: "CAD" },
      { ...base, supplier_id: "other" },
    ];
    for (const v of variants) expect(computeCartHash(v)).not.toBe(h);
    expect(computeCartHash(buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_320)]))).toBe(h);
  });

  it("blocks carts containing quarantined listings", () => {
    const input = baseInput();
    input.catalog = input.catalog.map((c) => (c.sku === "TK-250" ? { ...c, quarantined: true } : c));
    expect(evaluatePolicy(input).violations.map((v) => v.code)).toContain("QUARANTINED_SOURCE");
  });

  it("blocks carts from a quarantined supplier", () => {
    const r = evaluatePolicy(baseInput({ quarantined_source_ids: [SUPPLIER] }));
    expect(r.decision).toBe("BLOCK");
    expect(r.violations).toEqual([
      expect.objectContaining({ code: "QUARANTINED_SOURCE", severity: "BLOCK", evidence: { supplier_id: SUPPLIER } }),
    ]);
  });
});
