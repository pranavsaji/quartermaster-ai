import { describe, expect, it } from "vitest";
import { parsePackQuantity, usableUnits } from "@qm/quartermaster";

describe("pack-size normalisation — regressions", () => {
  it.each([
    // Dimensions are not multipacks.
    ["To-Go Containers 8x8 inch, 150 Count", 150, "HIGH"],
    ["9 x 13 in Foil Pans, 30 Count", 30, "HIGH"],
    ['Pizza boxes 12" x 12", 50 ct', 50, "HIGH"],
    ["Sheet cake boxes 10 x 14 x 4 in, 100 count", 100, "HIGH"],
    ["Aluminium foil roll 18 in x 500 ft", null, "NONE"],
    // Count × pack-of.
    ["Nitrile Gloves, 100 Count (Pack of 10)", 1_000, "HIGH"],
    ["Deli containers, 50 count each, case of 6", 300, "HIGH"],
    // Explicit multipacks still multiply.
    ["Food boxes, 6 x 50 count", 300, "HIGH"],
    ["Case of 6 x 50", 300, "HIGH"],
    ["6 packs of 50 lids", 300, "HIGH"],
    ["Pack of 300 (6 sleeves x 50)", 300, "HIGH"],
    // Comma-grouped counts.
    ["Black nitrile gloves, 1,000 count", 1_000, "HIGH"],
    ["Napkins case of 3,000", 3_000, "HIGH"],
    // Same figure stated twice agrees.
    ["Containers pack of 300 (300 count)", 300, "HIGH"],
  ] as const)("parses %s → %s (%s)", (title, qty, confidence) => {
    const p = parsePackQuantity(title);
    expect(p.pack_quantity).toBe(qty);
    expect(p.confidence).toBe(confidence);
  });

  it.each([
    // Two different figures without an explicit multiplier form: keep a best guess, never trust it.
    ["Case of 1000, 100 count boxes"],
    ["Parchment sheets 12x16, 1000 count"],
    ["Cups 50 count, 100 count"],
    // A bare "A x B" may be a size.
    ["Deli paper 12x12"],
  ])("marks disagreeing or ambiguous figures LOW: %s", (title) => {
    expect(parsePackQuantity(title).confidence).toBe("LOW");
  });

  it("never trusts a pack size that only appears in the description", () => {
    expect(parsePackQuantity("Kraft containers", "Case of 250")).toMatchObject({ pack_quantity: 250, confidence: "LOW" });
  });

  it("does not read the tail of a decimal or longer number as a count", () => {
    expect(parsePackQuantity("Wrap 2.5 pack").pack_quantity).toBeNull();
    expect(parsePackQuantity("Model 1234567 pcs").pack_quantity).toBeNull();
  });

  it("is total over non-string input", () => {
    expect(parsePackQuantity(undefined as never, 42 as never)).toEqual({ pack_quantity: null, confidence: "NONE", matched: null });
  });

  it("keeps market comparison off for low-confidence parses", () => {
    expect(usableUnits("each", "Deli paper 12x12").confidence).toBe("LOW");
    expect(usableUnits("each", "To-Go Containers 8x8 inch, 150 Count")).toEqual({ units: 150, confidence: "HIGH" });
  });
});
