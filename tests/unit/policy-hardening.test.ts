import { describe, expect, it } from "vitest";
import { PO_STATUSES, applyBps } from "@qm/contracts";
import { COMMITTED_ORDER_STATUSES, buildCart, evaluatePolicy, isCommittedOrderStatus, type PolicyInput } from "@qm/trustrail";
import { buildSupplierQuote } from "@qm/quartermaster";
import { NOW, SUPPLIER, baseInput, mandate, product, shipping, tax } from "../helpers/fixtures";

const codes = (r: ReturnType<typeof evaluatePolicy>) => r.violations.map((v) => v.code);
const withSupplier = (patch: Partial<NonNullable<PolicyInput["supplier"]>>, lines = [product(), shipping(0), tax(1_320)]) => {
  const input = baseInput({}, lines);
  input.supplier = { ...input.supplier!, ...patch };
  return input;
};

describe("policy engine — totality", () => {
  const blocked = (input: PolicyInput) => {
    let r!: ReturnType<typeof evaluatePolicy>;
    expect(() => (r = evaluatePolicy(input))).not.toThrow();
    expect(r.decision).toBe("BLOCK");
    expect(r.human_approval_required).toBe(true);
    expect(r.input_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    return r;
  };

  it("blocks a non-finite market reference price instead of throwing while hashing", () => {
    const input = baseInput({
      market: [
        {
          sku: "TK-250",
          reference_unit_price_minor: Number.NaN,
          candidate_unit_price_minor: Number.POSITIVE_INFINITY,
          observed_at: NOW.toISOString(),
          comparable: true,
        },
      ],
    });
    const r = evaluatePolicy(input);
    expect(r.decision).toBe("REVIEW_REQUIRED");
    expect(r.violations[0]?.evidence?.reason).toBe("invalid_price");
  });

  it("blocks a fractional quantity with an arithmetic violation", () => {
    const r = blocked(baseInput({}, [product({ quantity: 1.5, line_total_minor: 12_000 }), shipping(899), tax(990)]));
    expect(r.violations.map((v) => v.code)).toContain("CART_ARITHMETIC_INVALID");
  });

  it("blocks NaN cart totals and never skips human approval", () => {
    const input = baseInput();
    input.cart = { ...input.cart, total_minor: Number.NaN };
    expect(blocked(input).violations.map((v) => v.code)).toContain("CART_ARITHMETIC_INVALID");
  });

  it("blocks an invalid clock", () => {
    const r = blocked(baseInput({ now: new Date(Number.NaN) }));
    expect(r.violations[0]).toMatchObject({ code: "POLICY_INPUT_INVALID", evidence: { reason: "invalid_now" } });
    expect(r.evaluated_at).toBe("invalid-time");
  });

  it.each([
    ["per_order_limit_minor", Number.NaN],
    ["weekly_budget_minor", 1.5],
    ["auto_approval_limit_minor", -1],
    ["max_market_price_premium_pct", Number.POSITIVE_INFINITY],
    ["duplicate_window_hours", Number.NaN],
    ["max_quantity_multiple_of_need", 0],
    ["market_price_action", "ALLOW"],
    ["approved_supplier_ids", null],
  ] as const)("blocks a mandate with malformed %s", (field, value) => {
    const r = blocked(baseInput({ mandate: mandate({ [field]: value }) }));
    expect(r.violations[0]).toMatchObject({ code: "POLICY_INPUT_INVALID", evidence: { fields: [field] } });
  });

  it("blocks a malformed budget snapshot or request budget", () => {
    expect(
      blocked(baseInput({ budget: { limit_minor: 50_000, spent_minor: Number.NaN, reserved_minor: 0 } })).violations.map((v) => v.code),
    ).toContain("POLICY_INPUT_INVALID");
    expect(blocked(baseInput({ request_budget_limit_minor: 1.5 })).violations.map((v) => v.code)).toContain("REQUEST_BUDGET_EXCEEDED");
    // A negative request limit is legal (other committed orders already used it up) and simply exceeded.
    expect(blocked(baseInput({ request_budget_limit_minor: -100 })).violations.map((v) => v.code)).toContain("REQUEST_BUDGET_EXCEEDED");
  });

  it("fails closed when the input is structurally broken", () => {
    const r = blocked({ ...baseInput(), catalog: null as never });
    expect(r.violations).toEqual([expect.objectContaining({ code: "POLICY_INPUT_INVALID", evidence: { fields: ["catalog"] } })]);
    expect(r.mandate_version).toBe(1);
    // Anything that throws while reading the input is caught too.
    const throwing = baseInput();
    Object.defineProperty(throwing, "market", {
      get() {
        throw new Error("unreadable");
      },
    });
    expect(blocked(throwing).violations).toEqual([
      expect.objectContaining({ code: "POLICY_INPUT_INVALID", evidence: expect.objectContaining({ reason: "evaluation_error" }) }),
    ]);
    expect(() => evaluatePolicy(null as never)).not.toThrow();
    expect(evaluatePolicy(null as never).decision).toBe("BLOCK");
    expect(evaluatePolicy({} as never).decision).toBe("BLOCK");
  });

  // Audit M2: each of these was ALLOWed through JavaScript coercion.
  it.each([
    ["a quarantined supplier listed as a string", { quarantined_source_ids: SUPPLIER as never }, "quarantined_source_ids"],
    [
      'subscriptions_allowed as the string "false"',
      { mandate: mandate({ subscriptions_allowed: "false" as never }) },
      "subscriptions_allowed",
    ],
    ["a market age limit as a string", { market_reference_max_age_hours: "100000" as never }, "market_reference_max_age_hours"],
    ['an inactive supplier marked "false"', { supplier: { ...baseInput().supplier!, active: "false" as never } }, "supplier.active"],
    [
      "a prior order whose status is not a string",
      { prior_orders: [{ id: "po", supplier_id: SUPPLIER, skus: ["TK-250"], status: ["PAID"] as never, created_at: NOW.toISOString() }] },
      "prior_orders",
    ],
    ["a currency that is not an ISO code", { mandate: mandate({ currency: 840 as never }) }, "currency"],
  ] as [string, Partial<PolicyInput>, string][])("blocks %s", (_name, patch, field) => {
    const r = blocked(baseInput(patch));
    expect(r.violations[0]).toMatchObject({ code: "POLICY_INPUT_INVALID" });
    expect(r.violations[0]!.evidence!.fields).toContain(field);
  });

  it("blocks a quarantined supplier given as an array (the well-typed control)", () => {
    expect(codes(evaluatePolicy(baseInput({ quarantined_source_ids: [SUPPLIER] })))).toContain("QUARANTINED_SOURCE");
  });

  it("gives different malformed inputs different digests", () => {
    const a = evaluatePolicy(baseInput({ request_budget_limit_minor: 1.5 }));
    const b = evaluatePolicy(baseInput({ request_budget_limit_minor: 2.5 }));
    const c = evaluatePolicy(baseInput({ request_budget_limit_minor: Number.NaN }));
    expect(new Set([a.input_digest, b.input_digest, c.input_digest]).size).toBe(3);
  });
});

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

  it.each([0, -250, Number.NaN, Number.POSITIVE_INFINITY, 2.5])(
    "treats pack size %s as invalid in both the quantity and market checks",
    (pack) => {
      const r = evaluatePolicy({ ...big(), pack_quantity_by_sku: { "TK-250": pack } });
      const qty = r.violations.find((v) => v.code === "QUANTITY_EXCEEDS_NEED");
      expect(qty).toMatchObject({ severity: "REVIEW", evidence: { reason: "invalid_pack_quantity" } });
      expect(r.violations.find((v) => v.code === "MARKET_REFERENCE_UNAVAILABLE")).toMatchObject({
        evidence: { reason: "invalid_pack_quantity" },
      });
      expect(r.decision).toBe("REVIEW_REQUIRED");
    },
  );

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
    input.catalog = [
      {
        sku: "constructor",
        supplier_id: SUPPLIER,
        category: "food_packaging",
        unit_price_minor: 8_000,
        recurring: false,
        quarantined: false,
      },
    ];
    input.market = [];
    const r = evaluatePolicy(input);
    // Object.prototype.constructor is read neither as a pack size (invalid_pack_quantity) nor as
    // a need (invalid_need): the SKU simply has no forecast.
    const qty = r.violations.filter((v) => v.code === "QUANTITY_EXCEEDS_NEED");
    expect(qty.map((v) => v.evidence)).toEqual([{ sku: "constructor", reason: "no_forecast", units: 1 }]);
  });

  it("asks for review instead of skipping the over-purchase check when no forecast exists", () => {
    const r = evaluatePolicy(baseInput({ needed_units_by_sku: {} }));
    expect(r.decision).toBe("REVIEW_REQUIRED");
    const v = r.violations.find((x) => x.code === "QUANTITY_EXCEEDS_NEED");
    expect(v).toMatchObject({ severity: "REVIEW", evidence: { sku: "TK-250", reason: "no_forecast", units: 500 } });
    expect(v?.message).toMatch(/No forecast need is known for TK-250/);
    // A forecast for another SKU does not cover this one.
    expect(codes(evaluatePolicy(baseInput({ needed_units_by_sku: { OTHER: 10 } })))).toContain("QUANTITY_EXCEEDS_NEED");
    // With a forecast the line is checked normally.
    expect(codes(evaluatePolicy(baseInput()))).not.toContain("QUANTITY_EXCEEDS_NEED");
  });
});

describe("policy engine — timestamps", () => {
  const ref = (observed_at: string | null) => [
    { sku: "TK-250", reference_unit_price_minor: 31, candidate_unit_price_minor: 32, observed_at, comparable: true },
  ];
  const marketReason = (r: ReturnType<typeof evaluatePolicy>) =>
    r.violations.find((v) => v.code === "MARKET_REFERENCE_UNAVAILABLE")?.evidence?.reason;

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
    const r = evaluatePolicy(
      baseInput({ prior_orders: [{ id: "po_x", supplier_id: SUPPLIER, skus: ["TK-250"], status: "PAID", created_at: "garbage" }] }),
    );
    expect(r.violations.find((v) => v.code === "DUPLICATE_ORDER")?.evidence).toEqual({ purchase_order_ids: ["po_x"] });
  });
});

describe("committed order statuses", () => {
  it("exports one list of committed purchase-order statuses", () => {
    expect([...COMMITTED_ORDER_STATUSES]).toEqual(["APPROVED", "PAYMENT_PENDING", "PAID", "FULFILLED"]);
    for (const s of COMMITTED_ORDER_STATUSES) expect(PO_STATUSES).toContain(s);
  });

  it.each(PO_STATUSES.map((s) => [s] as const))("treats a prior %s order as a duplicate only when committed", (status) => {
    const r = evaluatePolicy(
      baseInput({ prior_orders: [{ id: "p", supplier_id: SUPPLIER, skus: ["TK-250"], status, created_at: "2026-11-10T10:00:00Z" }] }),
    );
    expect(codes(r).includes("DUPLICATE_ORDER")).toBe(isCommittedOrderStatus(status));
    expect(isCommittedOrderStatus(status)).toBe((COMMITTED_ORDER_STATUSES as readonly string[]).includes(status));
  });

  it("never counts an unknown status as committed", () => {
    expect(isCommittedOrderStatus("paid")).toBe(false);
    const r = evaluatePolicy(
      baseInput({
        prior_orders: [{ id: "p", supplier_id: SUPPLIER, skus: ["TK-250"], status: "SOMETHING", created_at: "2026-11-10T10:00:00Z" }],
      }),
    );
    expect(codes(r)).not.toContain("DUPLICATE_ORDER");
  });
});

describe("policy engine — tax rounding", () => {
  it("expects exactly the tax that quote building charges (one shared rounding helper)", () => {
    // 10_806 × 8.25 % = 891.495 → 891 under half-up on the exact product.
    for (const subtotal of [1, 6, 10_806, 16_000, 33_333, 99_999]) {
      const expected = applyBps(subtotal, 825);
      const cart = buildCart(SUPPLIER, "USD", [
        product({ quantity: 1, unit_price_minor: subtotal, line_total_minor: subtotal }),
        shipping(subtotal >= 15_000 ? 0 : 899),
        tax(expected),
      ]);
      const input = baseInput({
        cart,
        catalog: [
          {
            sku: "TK-250",
            supplier_id: SUPPLIER,
            category: "food_packaging",
            unit_price_minor: subtotal,
            recurring: false,
            quarantined: false,
          },
        ],
      });
      expect(codes(evaluatePolicy(input))).not.toContain("UNAUTHORIZED_LINE_ITEM");
      const quote = buildSupplierQuote(
        {
          id: SUPPLIER,
          name: "s",
          approved: true,
          active: true,
          checkout_eligible: true,
          lead_time_days: 1,
          tax_rate_bps: 825,
          fee_terms: [],
        },
        [
          {
            offer: {
              id: "o",
              supplier_id: SUPPLIER,
              sku: "TK-250",
              title: "t",
              description: "",
              category: "food_packaging",
              inventory_item_id: null,
              pack_quantity: 1,
              unit_price_minor: subtotal,
              currency: "USD",
              in_stock: true,
              recurring: false,
            },
            packs: 1,
          },
        ],
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
