import { describe, expect, it } from "vitest";
import { inputToMinor, minorToInput } from "@/lib/format";

describe("inputToMinor", () => {
  it("converts typed amounts to integer minor units", () => {
    expect(inputToMinor("300")).toBe(30000);
    expect(inputToMinor("299.99")).toBe(29999);
    expect(inputToMinor("12.5")).toBe(1250);
    expect(inputToMinor(" $1,234.50 ")).toBe(123450);
    expect(inputToMinor("0")).toBe(0);
  });

  it("rejects blank, negative, non-numeric and over-precise input", () => {
    expect(inputToMinor("")).toBeNull();
    expect(inputToMinor("   ")).toBeNull();
    expect(inputToMinor("-5")).toBeNull();
    expect(inputToMinor("abc")).toBeNull();
    expect(inputToMinor("1.234")).toBeNull();
    expect(inputToMinor("1e3")).toBeNull();
  });

  it("respects the currency exponent", () => {
    expect(inputToMinor("500", "JPY")).toBe(500);
    expect(inputToMinor("500.5", "JPY")).toBeNull();
  });

  it("round-trips with minorToInput", () => {
    expect(minorToInput(12345)).toBe("123.45");
    expect(inputToMinor(minorToInput(98765))).toBe(98765);
  });
});
