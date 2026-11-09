import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compareOffers, type CatalogOffer, type CompareInput, type SupplierProfile } from "@qm/quartermaster";

/** Deterministic, ICU-independent ranking of supplier offers. */
const supplier = (o: Partial<SupplierProfile> = {}): SupplierProfile => ({
  id: "sup",
  name: "Supplier",
  approved: true,
  active: true,
  checkout_eligible: true,
  lead_time_days: 2,
  tax_rate_bps: 0,
  fee_terms: [],
  ...o,
});
const offer = (o: Partial<CatalogOffer> = {}): CatalogOffer => ({
  id: "o",
  supplier_id: "sup",
  sku: "SKU",
  title: "Containers",
  description: "",
  category: "food_packaging",
  inventory_item_id: "inv",
  pack_quantity: 100,
  unit_price_minor: 1_000,
  currency: "USD",
  in_stock: true,
  recurring: false,
  ...o,
});
type Entry = CompareInput["offers"][number];
const entry = (o: Partial<CatalogOffer> = {}, s: Partial<SupplierProfile> = {}): Entry => ({
  offer: offer(o),
  supplier: supplier(s),
  storefront_lines: [],
  quarantined: false,
});
const NOW = new Date("2026-11-10T00:00:00Z");
const run = (offers: Entry[], needed_units = 100) => compareOffers({ needed_units, currency: "USD", offers, now: NOW });
const ids = (r: ReturnType<typeof compareOffers>) => r.map((e) => e.offer.id);

describe("compareOffers tie-breaks", () => {
  it("breaks a full tie on SKU by UTF-16 code unit, not locale collation", () => {
    // localeCompare puts "a" before "B"; code-unit order puts "B" (0x42) before "a" (0x61).
    const r = run([entry({ id: "lower", sku: "a-100" }), entry({ id: "upper", sku: "B-100" })]);
    expect(ids(r)).toEqual(["upper", "lower"]);
    // Accented SKUs sort after every ASCII letter by code unit.
    expect(ids(run([entry({ id: "accent", sku: "É-1" }), entry({ id: "plain", sku: "Z-1" })]))).toEqual(["plain", "accent"]);
  });

  it("falls back to supplier id and offer id when SKUs tie", () => {
    const r = run([entry({ id: "o2", sku: "S" }, { id: "s2" }), entry({ id: "o1", sku: "S" }, { id: "s1" })]);
    expect(ids(r)).toEqual(["o1", "o2"]);
    const sameSupplier = run([entry({ id: "z" }), entry({ id: "a" })]);
    expect(ids(sameSupplier)).toEqual(["a", "z"]);
  });

  it("prefers the cheaper order, then the shorter lead time, at equal unit cost", () => {
    // Same unit cost (10/unit), but 100 units cost less than 200.
    const r = run([entry({ id: "big", pack_quantity: 200, unit_price_minor: 2_000 }), entry({ id: "small" })]);
    expect(ids(r)).toEqual(["small", "big"]);
    const lead = run([
      entry({ id: "slow", sku: "A" }, { id: "s1", lead_time_days: 5 }),
      entry({ id: "fast", sku: "B" }, { id: "s2", lead_time_days: 1 }),
    ]);
    expect(ids(lead)).toEqual(["fast", "slow"]);
  });
});

describe("compareOffers with zero usable units", () => {
  it("ranks zero-unit offers (infinite unit cost) last, deterministically, without NaN comparisons", () => {
    // needed_units 0 → 0 packs → 0 units → Infinity per unit, for both offers.
    const r = run([entry({ id: "b", sku: "B" }), entry({ id: "a", sku: "A" })], 0);
    expect(r.map((e) => e.delivered_unit_cost_minor)).toEqual([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]);
    expect(ids(r)).toEqual(["a", "b"]);
    expect(r.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("puts a zero-pack offer after every finite one", () => {
    const r = run([entry({ id: "zero", sku: "A", pack_quantity: 0 }), entry({ id: "real", sku: "B" })]);
    expect(ids(r)).toEqual(["real", "zero"]);
    expect(r[1]!.delivered_unit_cost_minor).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("compareOffers with many offers", () => {
  it("keeps every eligible offer ahead of every ineligible one beyond 999 offers", () => {
    const offers: Entry[] = [];
    for (let i = 0; i < 1_100; i++) offers.push(entry({ id: `ok-${String(i).padStart(4, "0")}`, unit_price_minor: 1_000 + i }));
    // A very cheap but out-of-stock offer must not jump ahead of rank 1000+.
    offers.push(entry({ id: "cheap-oos", unit_price_minor: 1, in_stock: false }));
    const r = run(offers);
    expect(r).toHaveLength(1_101);
    expect(r.at(-1)!.offer.id).toBe("cheap-oos");
    expect(r.at(-1)!.rank).toBeNull();
    expect(r[1_099]!.rank).toBe(1_100);
  });

  it("orders ineligible offers by merit too", () => {
    const r = run([
      entry({ id: "oos-dear", in_stock: false, unit_price_minor: 5_000 }),
      entry({ id: "oos-cheap", in_stock: false, unit_price_minor: 900 }),
      entry({ id: "ok" }),
    ]);
    expect(ids(r)).toEqual(["ok", "oos-cheap", "oos-dear"]);
  });

  it("produces the same order for any permutation of the input", () => {
    const pool = [
      entry({ id: "a", sku: "X" }, { id: "s1" }),
      entry({ id: "b", sku: "X" }, { id: "s2" }),
      entry({ id: "c", sku: "x" }),
      entry({ id: "d", pack_quantity: 0 }),
      entry({ id: "e", in_stock: false }),
      entry({ id: "f", unit_price_minor: 999 }),
      entry({ id: "g" }, { lead_time_days: 9 }),
    ];
    const reference = ids(run(pool.map((p) => structuredClone(p))));
    fc.assert(
      fc.property(fc.shuffledSubarray(pool, { minLength: pool.length, maxLength: pool.length }), (shuffled) => {
        expect(ids(run(shuffled.map((p) => structuredClone(p))))).toEqual(reference);
      }),
      { numRuns: 200 },
    );
  });
});
