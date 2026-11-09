import { describe, expect, it } from "vitest";
import { checkNumber, parseNumberInput } from "@/lib/numbers";

describe("parseNumberInput", () => {
  it("parses plain decimals", () => {
    expect(parseNumberInput("12")).toBe(12);
    expect(parseNumberInput(" 1.5 ")).toBe(1.5);
    expect(parseNumberInput("-3")).toBe(-3);
    expect(parseNumberInput("0")).toBe(0);
  });

  it("returns null instead of 0 for blank input", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("   ")).toBeNull();
  });

  it.each(["abc", "1e3", "0x10", "Infinity", "1.", ".5", "1,000", "--1", "1 2"])("rejects %j", (value) => {
    expect(parseNumberInput(value)).toBeNull();
  });
});

describe("checkNumber", () => {
  it("accepts values inside the rule", () => {
    expect(checkNumber("30", { min: 5, max: 60, integer: true })).toEqual({ ok: true, value: 30 });
    expect(checkNumber("1.5", { min: 1, max: 10 })).toEqual({ ok: true, value: 1.5 });
  });

  it("explains each failure in words, never as a zod message", () => {
    expect(checkNumber("", { min: 0 })).toEqual({ ok: false, error: "This field is required." });
    expect(checkNumber("ten")).toEqual({ ok: false, error: "Enter a number using digits, like 12 or 1.5." });
    expect(checkNumber("2.5", { integer: true })).toEqual({ ok: false, error: "Use a whole number." });
    expect(checkNumber("61", { min: 5, max: 60 })).toEqual({ ok: false, error: "Enter a value from 5 to 60." });
    expect(checkNumber("-1", { min: 0 })).toEqual({ ok: false, error: "Enter 0 or more." });
    expect(checkNumber("11", { max: 10 })).toEqual({ ok: false, error: "Enter 10 or less." });
  });
});
