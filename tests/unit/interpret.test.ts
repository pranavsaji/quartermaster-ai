import { describe, expect, it } from "vitest";
import { interpretDeterministically, parseBudget } from "@qm/quartermaster";

const inventory = [
  { id: "inv_tk", sku: "PKG-TAKEOUT-32", name: "Takeaway containers", category: "food_packaging", keywords: ["takeaway", "takeout", "boxes"] },
  { id: "inv_oil", sku: "ING-CANOLA", name: "Canola frying oil", category: "cooking_ingredients", keywords: ["oil", "cooking oil"] },
];
const now = new Date("2026-11-10T18:00:00Z"); // Tuesday

describe("budget extraction", () => {
  it.each([
    ["stay under $500.", 50_000],
    ["cap it at $1500", 150_000],
    ["no more than $12000 this week", 1_200_000],
    ["budget $2500.50", 250_050],
    ["budget $2,500.50", 250_050],
    ["up to $1,250,000", 125_000_000],
    ["$9.9 max", 990],
    ["spend $2k", 200_000],
    ["spend $1.5k on oil", 150_000],
    ["around 1200 dollars", 120_000],
    ["2,500 USD tops", 250_000],
    ["under $ 300, please", 30_000],
  ])("%s → %d", (text, minor) => {
    expect(parseBudget(text)).toBe(minor);
  });

  it.each(["no budget given", "$0", "$1,2345", "$10.555", "five kraft boxes"])("rejects %s", (text) => {
    expect(parseBudget(text)).toBeNull();
  });

  it("never truncates a four-digit amount to three digits", () => {
    for (let dollars = 1000; dollars < 100_000; dollars += 777) {
      expect(parseBudget(`keep it below $${dollars}`)).toBe(dollars * 100);
    }
  });

  it("feeds the deterministic interpreter", () => {
    expect(interpretDeterministically("Restock oil, stay under $1500", inventory, now).budget_limit_minor).toBe(150_000);
  });
});

describe("inventory keyword matching", () => {
  const withPans = [...inventory, { id: "inv_pan", sku: "PKG-FOIL-913", name: "Foil pans", category: "food_packaging", keywords: ["foil pan", "half pan"] }];

  it("matches whole words only, so 'foil pans' does not select canola oil", () => {
    expect(interpretDeterministically("Need foil pans for Friday", withPans, now).inventory_item_ids).toEqual(["inv_pan"]);
  });

  it("still matches plurals and multi-word keywords", () => {
    expect(interpretDeterministically("Two more oils and cooking oil please", inventory, now).inventory_item_ids).toEqual(["inv_oil"]);
    expect(interpretDeterministically("restock takeaway boxes", inventory, now).inventory_item_ids).toEqual(["inv_tk"]);
  });

  it("treats regex metacharacters in keywords literally", () => {
    const odd = [{ id: "inv_x", sku: "X.(1)", name: "C++ cleaner", category: "cleaning_supplies", keywords: ["a+b"] }];
    expect(interpretDeterministically("buy c++ cleaner", odd, now).inventory_item_ids).toEqual(["inv_x"]);
    expect(interpretDeterministically("buy aab", odd, now).inventory_item_ids).toEqual([]);
    expect(interpretDeterministically("sku X.(1)", odd, now).inventory_item_ids).toEqual(["inv_x"]);
  });
});
