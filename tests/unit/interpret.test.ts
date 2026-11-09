import { describe, expect, it } from "vitest";
import { interpretDeterministically, isCalendarDate, parseBudget, sanitizeIntent } from "@qm/quartermaster";

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

  it.each([
    ["Grab $30 K-Cup pods", 3_000],
    ["Grab $30 k-cups", 3_000],
    ["$5 kits of gloves", 500],
    ["$12 Kosher salt", 1_200],
    ["$40 k9 treats", 4_000],
    ["$2k.", 200_000],
    ["$2K, no more", 200_000],
    ["budget $3 k", 300_000],
    ["(max $1.5k)", 150_000],
  ])("reads the thousands suffix only when it stands alone: %s", (text, minor) => {
    expect(parseBudget(text)).toBe(minor);
  });

  it("never truncates a four-digit amount to three digits", () => {
    for (let dollars = 1000; dollars < 100_000; dollars += 777) {
      expect(parseBudget(`keep it below $${dollars}`)).toBe(dollars * 100);
    }
  });

  it.each([
    ["Restock 2 cases of the $30 gloves, keep it under $500", 50_000],
    ["Get the $12 liners and the $45 oil; budget $300", 30_000],
    ["Order the $8.50 cups, $600 max", 60_000],
    ["Two $25 sanitizer jugs without exceeding $90 total", 9_000],
    ["Under $400 for the $35 boxes, and no more than $350 overall", 35_000],
  ])("prefers the amount a budget cue marks: %s", (text, minor) => {
    expect(parseBudget(text)).toBe(minor);
  });

  it.each(["Buy the $30 gloves and the $45 oil", "Restock 2 cases of the $30 gloves. The $12 liners too."])(
    "returns null for several amounts none of which is a cap: %s",
    (text) => {
      expect(parseBudget(text)).toBeNull();
    },
  );

  it("does not read a cue across a sentence end", () => {
    expect(parseBudget("Keep it under control. Buy the $30 gloves and the $45 oil.")).toBeNull();
  });

  it("feeds the deterministic interpreter", () => {
    expect(interpretDeterministically("Restock 2 cases of the $30 gloves, keep it under $500", inventory, now).budget_limit_minor).toBe(
      50_000,
    );
    expect(interpretDeterministically("Restock oil, stay under $1500", inventory, now).budget_limit_minor).toBe(150_000);
  });
});

describe("required-by dates", () => {
  it("rejects impossible calendar dates instead of rolling them over", () => {
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(interpretDeterministically("oil by 2026-02-30", inventory, now).required_by).toBeNull();
    expect(interpretDeterministically("oil by 2026-02-30 or 2026-03-02", inventory, now).required_by).toBe("2026-03-02");
    expect(sanitizeIntent({ required_by: "2026-02-30" }, inventory)?.required_by).toBeNull();
    expect(sanitizeIntent({ required_by: "2026-11-13" }, inventory)?.required_by).toBe("2026-11-13");
  });

  it("resolves weekdays and 'tomorrow' in UTC by default", () => {
    expect(interpretDeterministically("oil by friday", inventory, now).required_by).toBe("2026-11-13");
    expect(interpretDeterministically("oil tomorrow", inventory, now).required_by).toBe("2026-11-11");
    expect(interpretDeterministically("oil by tuesday", inventory, now).required_by).toBe("2026-11-17");
  });

  it("resolves relative dates in the owner's time zone when given", () => {
    // 2026-11-10T03:00Z is still Monday 2026-11-09 evening in Los Angeles.
    const lateMonday = new Date("2026-11-10T03:00:00Z");
    expect(interpretDeterministically("oil tomorrow", inventory, lateMonday).required_by).toBe("2026-11-11");
    expect(interpretDeterministically("oil tomorrow", inventory, lateMonday, { timeZone: "America/Los_Angeles" }).required_by).toBe(
      "2026-11-10",
    );
    expect(interpretDeterministically("oil by tuesday", inventory, lateMonday, { timeZone: "America/Los_Angeles" }).required_by).toBe(
      "2026-11-10",
    );
    expect(interpretDeterministically("oil by tuesday", inventory, lateMonday).required_by).toBe("2026-11-17");
  });

  it("falls back to UTC for an unknown time zone and to null for an invalid clock", () => {
    expect(interpretDeterministically("oil tomorrow", inventory, now, { timeZone: "Mars/Olympus" }).required_by).toBe("2026-11-11");
    expect(interpretDeterministically("oil tomorrow", inventory, new Date(Number.NaN)).required_by).toBeNull();
  });
});

describe("inventory keyword matching", () => {
  const withPans = [
    ...inventory,
    { id: "inv_pan", sku: "PKG-FOIL-913", name: "Foil pans", category: "food_packaging", keywords: ["foil pan", "half pan"] },
  ];

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
