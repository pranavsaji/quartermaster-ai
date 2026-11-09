import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseVolume, parseVolumeLitres, usableUnits } from "@qm/quartermaster";

/**
 * Volume normalisation for liquid listings. A HIGH reading becomes the per-litre market
 * reference, so it must only be HIGH when volume and pack count are unambiguous.
 */
describe("parseVolume — realistic listing titles", () => {
  it.each<[string, number | null, "HIGH" | "LOW" | "NONE"]>([
    // Single volumes
    ["Canola frying oil, 18 L jug", 18, "HIGH"],
    ["Canola 18L", 18, "HIGH"],
    ["Sunflower oil 5 litre", 5, "HIGH"],
    ["Extra virgin olive oil 2.5 Liters", 2.5, "HIGH"],
    ["White distilled vinegar, 1 qt", 0.946, "HIGH"],
    ["Frying oil 35 lb (4.5 gal)", 17.034, "HIGH"],
    ["Glass cleaner 1,000 ml refill", 1, "HIGH"],
    ["Bleach 1 gal (3.78 L)", 3.785, "HIGH"], // two readings of the same volume
    // Multipacks: volume × count
    ["Olive oil 3L (Pack of 2)", 6, "HIGH"],
    ["Sanitizer 1 gallon x 4", 15.142, "HIGH"],
    ["Oil 2 x 5 L", 10, "HIGH"],
    ["Hand sanitizer 500 mL x 12", 6, "HIGH"],
    ["Olive oil 750ml bottles x 6", 4.5, "HIGH"],
    ["Sesame oil 12 x 56 fl oz", 19.873, "HIGH"],
    ["Bottled water 16.9 fl oz bottles, 24 count", 11.995, "HIGH"],
    ["Vegetable oil 4/1 gal case", 15.142, "HIGH"],
    ["Dish soap 1 gal, 6/case", 22.712, "HIGH"],
    ["Peanut oil 2-Pack, 3 L each", 6, "HIGH"],
    ["Sanitizer 1 gallon, 4 count", 15.142, "HIGH"],
    ["Olive oil 6 x 1 L (6 L total)", 6, "HIGH"],
    ["Avocado oil 1 liter (Pack of 1)", 1, "HIGH"],
    // Ambiguous: decimal comma, disagreeing volumes or counts
    ["Canola oil 1,5 L", 1.5, "LOW"],
    ["Huile de tournesol 0,75 l", 0.75, "LOW"],
    ["Rapeseed oil 2 x 1,5 L", 3, "LOW"],
    ["Fits 3L and 5L jugs", 3, "LOW"],
    ["Oil 3L, Pack of 2, 4 count", 3, "LOW"],
    ["Oil 3L x 2 L", 3, "LOW"],
    // Not a volume
    ["Canola oil 35 lb", null, "NONE"],
    ["Takeout containers, 250 count", null, "NONE"],
    ["Storage lids 5 lids", null, "NONE"],
  ])("%s → %s L (%s)", (title, litres, confidence) => {
    const r = parseVolume(title);
    expect(r.litres).toBe(litres);
    expect(r.confidence).toBe(confidence);
    expect(parseVolumeLitres(title)).toBe(litres);
  });

  it("never reads the tail of a decimal-comma number as the volume", () => {
    // The previous parser read "1,5 L" as 5 L.
    expect(parseVolume("Canola oil 1,5 L").litres).not.toBe(5);
  });
});

describe("usableUnits for volume items", () => {
  it("uses the combined title reading", () => {
    expect(usableUnits("liter", "Olive oil 3L (Pack of 2)")).toEqual({ units: 6, confidence: "HIGH" });
    expect(usableUnits("L", "Sanitizer 1 gallon x 4")).toEqual({ units: 15.142, confidence: "HIGH" });
  });

  it("is LOW for a decimal comma, never HIGH for every parse", () => {
    expect(usableUnits("liter", "Canola oil 1,5 L")).toEqual({ units: 1.5, confidence: "LOW" });
  });

  it("caps a description-only reading at LOW, like pack sizes", () => {
    expect(usableUnits("liter", "Olive oil", "One 3L bottle")).toEqual({ units: 3, confidence: "LOW" });
    expect(usableUnits("liter", "Olive oil", "")).toEqual({ units: null, confidence: "NONE" });
    expect(usableUnits("liter", "Olive oil", null)).toEqual({ units: null, confidence: "NONE" });
  });

  it("downgrades a title volume when the description states a pack count the title lacks", () => {
    expect(usableUnits("liter", "Olive oil 3L", "Pack of 2 bottles")).toEqual({ units: 3, confidence: "LOW" });
    // Agreeing counts keep HIGH.
    expect(usableUnits("liter", "Olive oil 3L (Pack of 2)", "Pack of 2 bottles, 3 L each")).toEqual({ units: 6, confidence: "HIGH" });
    expect(usableUnits("liter", "Canola 18L", "Heavy-duty jug with handle.")).toEqual({ units: 18, confidence: "HIGH" });
  });

  // Titles and descriptions are capped at 2,000 characters and the patterns have no nested
  // optional whitespace, so even 400 KB of adversarial text is handled in a few milliseconds. The
  // bound only separates linear from catastrophic behaviour; it cannot flake on a slow worker.
  it.each([
    ["whitespace runs between numbers and dashes", `1${" ".repeat(50)}-${" ".repeat(50)}`],
    ["digits and spaces", "1 ".repeat(20)],
    ["dangling multipliers", "12 x ".repeat(20)],
    ["pack-of chains", "Pack of 2 ".repeat(20)],
    ["volumes without units", "1.5 - - - ".repeat(20)],
  ])("handles a 400 KB title of %s in bounded time", (_name, unit) => {
    const huge = unit.repeat(Math.ceil(400_000 / unit.length)).slice(0, 400_000);
    usableUnits("liter", "warm up 1 L", "warm up");
    const started = performance.now();
    usableUnits("liter", `${huge} 3 L`, huge);
    usableUnits("liter", huge, huge);
    parseVolume(huge);
    expect(performance.now() - started).toBeLessThan(2_500);
  });

  it("never throws and returns positive finite litres or null", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), fc.option(fc.string({ maxLength: 120 })), (title, description) => {
        const r = usableUnits("liter", title, description);
        if (r.units === null) expect(r.confidence).toBe("NONE");
        else {
          expect(Number.isFinite(r.units)).toBe(true);
          expect(r.units).toBeGreaterThan(0);
        }
        expect(() => parseVolume(title)).not.toThrow();
      }),
      { numRuns: 500 },
    );
    expect(parseVolume(42 as never)).toEqual({ litres: null, confidence: "NONE", matched: null });
  });
});
