import { describe, expect, it } from "vitest";
import {
  averageDailyUsage,
  compareOffers,
  daysOfCover,
  deliveredUnitCost,
  fitToBudget,
  forecastItem,
  interpretDeterministically,
  median,
  packsFor,
  parsePackQuantity,
  parseVolumeLitres,
  planCarts,
  sanitizeIntent,
  stockStatus,
  usableUnits,
  withoutOutliers,
  buildSupplierQuote,
  type CatalogOffer,
  type SupplierProfile,
} from "@qm/quartermaster";

const harbor: SupplierProfile = {
  id: "harbor",
  name: "Harbor",
  approved: true,
  active: true,
  checkout_eligible: true,
  lead_time_days: 2,
  tax_rate_bps: 825,
  fee_terms: [{ code: "SHIP_STD", label: "Standard", kind: "SHIPPING", amount_minor: 899, waived_over_minor: 15_000 }],
};
const offer = (o: Partial<CatalogOffer> = {}): CatalogOffer => ({
  id: "c1",
  supplier_id: "harbor",
  sku: "TK-250",
  title: "Containers 250",
  description: "",
  category: "food_packaging",
  inventory_item_id: "inv_tk",
  pack_quantity: 250,
  unit_price_minor: 8_000,
  currency: "USD",
  in_stock: true,
  recurring: false,
  ...o,
});

describe("forecasting", () => {
  const base = {
    inventory_item_id: "inv_tk",
    sku: "PKG-TAKEOUT-32",
    name: "Takeaway containers",
    unit: "each",
    on_hand: 120,
    inbound_confirmed: 0,
    committed: 0,
    daily_usage_history: Array(14).fill(80),
    lead_time_days: 2,
    safety_stock: 80,
    coverage_days: 3,
  };

  it("reproduces the plan's worked example (reorder trigger 240)", () => {
    const l = forecastItem(base);
    expect(l.reorder_point).toBe(240);
    expect(l.needs_reorder).toBe(true);
    expect(l.target_stock).toBe(480);
    expect(l.suggested_quantity).toBe(360);
  });

  it("applies a visible demand multiplier", () => {
    const l = forecastItem(base, 1.25);
    expect(l.forecast_daily_usage).toBe(100);
    expect(l.reorder_point).toBe(280);
    expect(l.suggested_quantity).toBe(460);
    expect(l.explanation).toContain("1.25 demand multiplier");
  });

  it("counts confirmed inbound deliveries as available stock", () => {
    const l = forecastItem({ ...base, inbound_confirmed: 500 });
    expect(l.needs_reorder).toBe(false);
    expect(l.suggested_quantity).toBe(0);
  });

  it("rounds suggestions up to whole packs", () => {
    expect(forecastItem({ ...base, pack_quantity: 250 }).suggested_quantity).toBe(500);
  });

  it("uses a trimmed mean that ignores one unusual day", () => {
    expect(averageDailyUsage([80, 80, 80, 80, 80, 80, 800])).toBe(80);
    expect(averageDailyUsage([])).toBe(0);
    expect(averageDailyUsage([-5, Number.NaN, 10])).toBe(10);
  });

  it("rejects non-positive multipliers", () => {
    expect(() => forecastItem(base, 0)).toThrow();
  });

  it("classifies stock health and days of cover", () => {
    expect(stockStatus(0, 240, 80)).toBe("OUT");
    expect(stockStatus(50, 240, 80)).toBe("CRITICAL");
    expect(stockStatus(120, 240, 80)).toBe("LOW");
    expect(stockStatus(500, 240, 80)).toBe("OK");
    expect(daysOfCover(120, 80)).toBe(1.5);
    expect(daysOfCover(10, 0)).toBeNull();
  });
});

describe("pack-size normalisation", () => {
  it.each([
    ["Kraft takeout containers 32 oz, case of 250", 250],
    ["Takeout containers 32 oz, pack of 300", 300],
    ["Premium containers (300 ct)", 300],
    ["Clamshell boxes 150-Count", 150],
    ["Food boxes, 6 x 50 count", 300],
    ["Nitrile gloves 1000 pcs", 1000],
  ])("parses %s → %d", (title, qty) => {
    expect(parsePackQuantity(title).pack_quantity).toBe(qty);
  });

  it("marks unparseable listings as non-comparable instead of guessing", () => {
    expect(parsePackQuantity("Takeout containers, bulk")).toEqual({ pack_quantity: null, confidence: "NONE", matched: null });
  });

  it("normalises volumes to litres", () => {
    expect(parseVolumeLitres("Canola oil 18 L jug")).toBe(18);
    expect(parseVolumeLitres("Frying oil 35 lb (4.5 gal)")).toBeCloseTo(17.034, 2);
    expect(parseVolumeLitres("Oil 2 x 5 L")).toBe(10);
    expect(usableUnits("liter", "Canola 18L").units).toBe(18);
  });

  it("computes robust references", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(withoutOutliers([30, 31, 32, 33, 300])).toEqual([30, 31, 32, 33]);
  });
});

describe("supplier comparison", () => {
  it("ranks on delivered unit cost, not sticker price", () => {
    // 100 units at $40 vs 250 units at $75: the bigger pack is cheaper per unit.
    const small = {
      offer: offer({ id: "s", sku: "S-100", pack_quantity: 100, unit_price_minor: 4_000 }),
      supplier: { ...harbor, tax_rate_bps: 0, fee_terms: [] },
      storefront_lines: [],
      quarantined: false,
    };
    const big = {
      offer: offer({ id: "b", sku: "B-250", pack_quantity: 250, unit_price_minor: 7_500 }),
      supplier: { ...harbor, tax_rate_bps: 0, fee_terms: [] },
      storefront_lines: [],
      quarantined: false,
    };
    const r = compareOffers({ needed_units: 250, currency: "USD", offers: [small, big], now: new Date() });
    expect(r[0]!.offer.sku).toBe("B-250");
    expect(r[0]!.delivered_unit_cost_minor).toBe(30);
  });

  it("includes shipping, tax and storefront fees in delivered cost", () => {
    const q = buildSupplierQuote(harbor, [{ offer: offer(), packs: 1 }], "USD", [
      { kind: "FEE", code: "X", description: "Fee", amount_minor: 500 },
    ]);
    expect(q.total_minor).toBe(8_000 + 899 + 500 + 660);
    expect(deliveredUnitCost(q, 250)).toBeCloseTo(40.236, 3);
  });

  it("marks unapproved, out-of-stock and late suppliers ineligible", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    const r = compareOffers({
      needed_units: 100,
      currency: "USD",
      now,
      required_by: new Date("2026-11-10T23:59:59Z"),
      offers: [
        {
          offer: offer({ id: "a" }),
          supplier: { ...harbor, id: "a", approved: false, lead_time_days: 0 },
          storefront_lines: [],
          quarantined: false,
        },
        {
          offer: offer({ id: "b", in_stock: false }),
          supplier: { ...harbor, id: "b", lead_time_days: 0 },
          storefront_lines: [],
          quarantined: false,
        },
        { offer: offer({ id: "c" }), supplier: { ...harbor, id: "c", lead_time_days: 3 }, storefront_lines: [], quarantined: false },
      ],
    });
    expect(r.every((e) => !e.eligible)).toBe(true);
    expect(r.flatMap((e) => e.ineligible_reasons).join(" ")).toMatch(/approved list.*|Out of stock|Arrives after/);
  });

  it("plans one cart per supplier and re-plans around excluded suppliers", () => {
    const evalA = compareOffers({
      needed_units: 300,
      currency: "USD",
      now: new Date(),
      offers: [
        {
          offer: offer({ id: "qs", supplier_id: "qs", sku: "QS-300", pack_quantity: 300, unit_price_minor: 5_400 }),
          supplier: { ...harbor, id: "qs" },
          storefront_lines: [],
          quarantined: true,
        },
        { offer: offer(), supplier: harbor, storefront_lines: [], quarantined: false },
      ],
    }).map((e, i) => ({ ...e, id: `cand_${i}` }));
    const first = planCarts({
      candidates_by_item: new Map([["inv_tk", evalA]]),
      currency: "USD",
      storefront_lines_by_supplier: new Map(),
      excluded_supplier_ids: new Set(),
      excluded_candidate_ids: new Set(),
    });
    expect(first.carts[0]!.supplier.id).toBe("qs");
    const second = planCarts({
      candidates_by_item: new Map([["inv_tk", evalA]]),
      currency: "USD",
      storefront_lines_by_supplier: new Map(),
      excluded_supplier_ids: new Set(["qs"]),
      excluded_candidate_ids: new Set(),
    });
    expect(second.carts[0]!.supplier.id).toBe("harbor");
  });

  it("trims a cart to fit a cap by dropping the least urgent item", () => {
    const planned = {
      supplier: harbor,
      cart: buildSupplierQuote(
        harbor,
        [
          { offer: offer(), packs: 2 },
          { offer: offer({ id: "g", sku: "GLV", inventory_item_id: "inv_g", unit_price_minor: 6_400, pack_quantity: 1000 }), packs: 1 },
        ],
        "USD",
      ),
      lines: [
        { offer: offer(), packs: 2, units: 500, inventory_item_id: "inv_tk" },
        {
          offer: offer({ id: "g", sku: "GLV", inventory_item_id: "inv_g", unit_price_minor: 6_400, pack_quantity: 1000 }),
          packs: 1,
          units: 1000,
          inventory_item_id: "inv_g",
        },
      ],
      candidate_ids: ["c1", "c2"],
    };
    const fitted = fitToBudget(
      planned,
      20_000,
      new Map([
        ["inv_tk", 1],
        ["inv_g", 5],
      ]),
      "USD",
      [],
    );
    expect(fitted!.lines.map((l) => l.inventory_item_id)).toEqual(["inv_tk"]);
    expect(fitToBudget(planned, 100, new Map(), "USD", [])).toBeNull();
  });

  it("never orders zero packs for a positive need", () => {
    expect(packsFor(1, 250)).toBe(1);
    expect(packsFor(0, 250)).toBe(0);
  });
});

describe("intent interpretation", () => {
  const inventory = [
    {
      id: "inv_tk",
      sku: "PKG-TAKEOUT-32",
      name: "Takeaway containers",
      category: "food_packaging",
      keywords: ["takeaway", "takeout", "boxes"],
    },
    { id: "inv_oil", sku: "ING-CANOLA", name: "Canola frying oil", category: "cooking_ingredients", keywords: ["oil", "cooking oil"] },
  ];
  const now = new Date("2026-11-10T18:00:00Z"); // Tuesday

  it("extracts items, demand and budget deterministically", () => {
    const i = interpretDeterministically(
      "Busy weekend! Find the best prices for takeaway boxes and cooking oil, stay under $500.",
      inventory,
      now,
    );
    expect(i.inventory_item_ids.sort()).toEqual(["inv_oil", "inv_tk"]);
    expect(i.demand_multiplier).toBe(1.25);
    expect(i.budget_limit_minor).toBe(50_000);
  });

  it("understands explicit percentages and dates", () => {
    const i = interpretDeterministically("We expect 40% more covers; restock containers by 2026-11-13", inventory, now);
    expect(i.demand_multiplier).toBe(1.4);
    expect(i.required_by).toBe("2026-11-13");
    expect(interpretDeterministically("oil by friday", inventory, now).required_by).toBe("2026-11-13");
  });

  it("sanitises model output: unknown ids dropped, multiplier clamped, bad dates nulled", () => {
    const s = sanitizeIntent(
      {
        inventory_item_ids: ["inv_tk", "evil"],
        demand_multiplier: 50,
        budget_limit_minor: 1.5,
        required_by: "tomorrow",
        notes: "x",
        unsupported_requests: [1, "wine"],
      },
      inventory,
    );
    expect(s).toEqual({
      inventory_item_ids: ["inv_tk"],
      demand_multiplier: 3,
      budget_limit_minor: null,
      required_by: null,
      notes: "x",
      unsupported_requests: ["wine"],
    });
    expect(sanitizeIntent(null, inventory)).toBeNull();
  });
});
