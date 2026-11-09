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
