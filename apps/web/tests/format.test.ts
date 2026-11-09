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

  it("accepts commas only as thousands separators", () => {
    expect(inputToMinor("1,234")).toBe(123400);
    expect(inputToMinor("1,234,567.89")).toBe(123456789);
    expect(inputToMinor("$ 12,000")).toBe(1200000);
    // A decimal comma or misplaced separator is not silently read as a bigger number.
    expect(inputToMinor("12,50")).toBeNull();
    expect(inputToMinor("1,23")).toBeNull();
    expect(inputToMinor("1234,567")).toBeNull();
    expect(inputToMinor(",123")).toBeNull();
    expect(inputToMinor("1,234,")).toBeNull();
    expect(inputToMinor("1.234,5")).toBeNull();
    expect(inputToMinor("1 234")).toBeNull();
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
