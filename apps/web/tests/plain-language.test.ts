import { VIOLATION_CODES } from "@qm/contracts";
import { describe, expect, it } from "vitest";
import {
  availabilityLabel,
  checkDetail,
  checkLabel,
  findingSourceLabel,
  forecastMethodLabel,
  plainText,
  stepLabel,
  violationCopy,
} from "@/lib/plain-language";

describe("plain-language copy", () => {
  it("has an owner-language title and sentence for every violation code", () => {
    for (const code of VIOLATION_CODES) {
      const copy = violationCopy(code);
      expect(copy.title, code).not.toMatch(/_/);
      expect(copy.sentence.length, code).toBeGreaterThan(10);
    }
  });

  it("degrades an unknown code to readable words and the server's message", () => {
    expect(violationCopy("SOMETHING_NEW", "Server says why.")).toEqual({ title: "Something new", sentence: "Server says why." });
  });

  it("labels TrustRail checks, including per-SKU market checks", () => {
    expect(checkLabel("WEEKLY_BUDGET")).toBe("Within this week's budget");
    expect(checkLabel("MARKET_PRICE:CF-CAN-18L")).toBe("Market price for CF-CAN-18L");
    expect(checkLabel("BRAND_NEW_CHECK")).toBe("Brand new check");
  });

  it("formats the minor-unit figures in budget check details as money", () => {
    const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;
    expect(checkDetail("PER_ORDER_LIMIT", "10820 of 50000.", usd)).toBe("$108.20 of $500.00.");
    expect(checkDetail("CURRENCY", "Cart USD, mandate USD.", usd)).toBe("Cart USD, mandate USD.");
  });

  it("agrees plurals with their number, ignoring digits inside words", () => {
    expect(plainText("Model interpretation: 1 item(s), 1.25× demand.")).toBe("Model interpretation: 1 item, 1.25× demand.");
    expect(plainText("Attempt 1: 2 cart(s) planned, 1 item(s) without an eligible supplier.")).toBe(
      "Attempt 1: 2 carts planned, 1 item without an eligible supplier.",
    );
    expect(plainText("12 Channel3 listing(s) for oil")).toBe("12 Channel3 listings for oil");
    expect(plainText("1 Channel3 listing(s) for oil")).toBe("1 Channel3 listing for oil");
  });

  it("turns enum codes and field names into words and rounds money to cents", () => {
    expect(plainText("Coastal Foods: REVIEW_REQUIRED (MARKET_REFERENCE_UNAVAILABLE).")).toBe(
      "Coastal Foods: needs review (no market price to compare).",
    );
    expect(plainText("Harbor: ALLOW.")).toBe("Harbor: allowed.");
    expect(plainText("reference UNAVAILABLE with 1 review_count")).toBe("reference unavailable with 1 review count");
    expect(plainText("which equals $0.3464 per usable unit")).toBe("which equals $0.35 per usable unit");
    // SKUs with hyphens are left alone.
    expect(plainText("Listing QS-TK32-300 was quarantined")).toBe("Listing QS-TK32-300 was quarantined");
  });

  it("names agent steps, finding sources, availability and the forecast method in words", () => {
    expect(stepLabel("trustrail.evaluate")).toBe("TrustRail check");
    expect(stepLabel("brand.new_tool")).toBe("Brand new tool");
    expect(findingSourceLabel("supplier_catalog_item")).toBe("Supplier listing");
    expect(findingSourceLabel("something_else")).toBe("Something else");
    expect(availabilityLabel("InStock")).toBe("In stock");
    expect(availabilityLabel("https://schema.org/OutOfStock")).toBe("Out of stock");
    expect(forecastMethodLabel("REORDER_POINT_V1")).toBe("Reorder-point model");
  });
});
