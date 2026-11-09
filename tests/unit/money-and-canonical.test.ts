import { describe, expect, it } from "vitest";
import { applyBps, decimalStringToMinor, floatToMinor, formatMoney, minorToDecimalString } from "@qm/contracts";
import { canonicalize, digest } from "@qm/trustrail";

describe("money", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [99, "0.99"],
    [17_320, "173.20"],
    [-1_250, "-12.50"],
  ])("formats %d as %s for PayPal", (minor, s) => {
    expect(minorToDecimalString(minor, "USD")).toBe(s);
    expect(decimalStringToMinor(s, "USD")).toBe(minor);
  });

  it("handles zero-decimal currencies", () => {
    expect(minorToDecimalString(1500, "JPY")).toBe("1500");
  });

  it("rejects precision beyond the currency", () => {
    expect(() => decimalStringToMinor("1.005", "USD")).toThrow();
    expect(decimalStringToMinor("10.500", "USD")).toBe(1050);
  });

  it("never returns negative zero", () => {
    for (const s of ["-0", "-0.00", "-0.0", "0", "-00"]) {
      expect(Object.is(decimalStringToMinor(s, "USD"), 0)).toBe(true);
    }
    expect(Object.is(decimalStringToMinor("-0", "JPY"), 0)).toBe(true);
    expect(decimalStringToMinor("-0.01", "USD")).toBe(-1);
  });

  it("rejects malformed and unsafe amounts", () => {
    expect(() => decimalStringToMinor("1e3", "USD")).toThrow();
    expect(() => minorToDecimalString(1.5, "USD")).toThrow();
    expect(() => minorToDecimalString(1, "XXX")).toThrow();
  });

  it("converts floats from external sources, absorbing binary representation error", () => {
    expect(floatToMinor(19.99, "USD")).toBe(1999);
    expect(floatToMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(floatToMinor(0, "USD")).toBe(0);
    expect(Object.is(floatToMinor(-0, "USD"), 0)).toBe(true);
  });

  it.each([
    // value, USD, JPY — decimal midpoints whose binary value sits just below the half
    [1.005, 101, 1],
    [10.075, 1008, 10],
    [2.675, 268, 3],
    [1.255, 126, 1],
    [0.005, 1, 0],
    [0.0049999, 0, 0],
    [123_456_789.125, 12_345_678_913, 123_456_789],
    [-1.005, -101, -1], // half away from zero
    [1e-7, 0, 0],
  ])("rounds %s half away from zero at the currency precision", (value, usd, jpy) => {
    expect(floatToMinor(value, "USD")).toBe(usd);
    expect(floatToMinor(value, "JPY")).toBe(jpy);
  });

  it("rejects non-finite input and results outside the safe-integer range", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "1" as never]) {
      expect(() => floatToMinor(v, "USD")).toThrow(/Invalid price/);
    }
    expect(() => floatToMinor(1e21, "USD")).toThrow(/safe integer/);
    expect(() => floatToMinor(1, "XXX")).toThrow(/Unsupported currency/);
  });

  it("computes basis points with half-up rounding", () => {
    expect(applyBps(16_000, 825)).toBe(1_320);
    expect(applyBps(10_800, 825)).toBe(891);
    expect(applyBps(2, 2_500)).toBe(1); // 0.5 → 1
    expect(applyBps(-2, 2_500)).toBe(0); // -0.5 → 0, like Math.round, and never -0
    expect(Object.is(applyBps(-2, 2_500), 0)).toBe(true);
    expect(applyBps(-6, 2_500)).toBe(-1); // -1.5 → -1
  });

  it("validates the rate and stays exact above 2^53 intermediate products", () => {
    for (const bad of [-1, 10_001, 8.25, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => applyBps(10_000, bad)).toThrow(/Basis points/);
    }
    expect(() => applyBps(1.5, 825)).toThrow();
    // 9_007_199_254_740_991 × 825 overflows a double; BigInt keeps it exact.
    expect(applyBps(Number.MAX_SAFE_INTEGER, 825)).toBe(743_093_938_516_132); // …131.7575 rounds up
    expect(applyBps(Number.MAX_SAFE_INTEGER, 10_000)).toBe(Number.MAX_SAFE_INTEGER);
    expect(applyBps(0, 0)).toBe(0);
  });

  it("formats for display", () => {
    expect(formatMoney(17_320, "USD")).toBe("$173.20");
  });
});

describe("canonical encoding", () => {
  it("sorts keys and drops undefined members", () => {
    expect(canonicalize({ b: 1, a: { d: true, c: null }, e: undefined })).toBe('{"a":{"c":null,"d":true},"b":1}');
  });

  it("is insensitive to key insertion order", () => {
    expect(digest({ x: 1, y: [1, 2] })).toBe(digest({ y: [1, 2], x: 1 }));
  });

  it("preserves array order", () => {
    expect(digest([1, 2])).not.toBe(digest([2, 1]));
  });

  it("rejects floats, non-finite numbers and non-plain objects", () => {
    expect(() => canonicalize({ a: 1.5 })).toThrow();
    expect(() => canonicalize({ a: Number.NaN })).toThrow();
    expect(() => canonicalize({ a: new Date() })).toThrow();
    expect(() => canonicalize({ a: () => 1 })).toThrow();
  });

  it("rejects sparse arrays instead of emitting invalid JSON", () => {
    // eslint-disable-next-line no-sparse-arrays -- the hole is the input under test
    expect(() => canonicalize([1, , 3])).toThrow(TypeError);
    expect(() => canonicalize({ a: new Array(2) })).toThrow(/sparse/);
    expect(canonicalize([1, null, 3])).toBe("[1,null,3]");
  });

  it("rejects cycles with a TypeError but allows shared references", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalize(cyclic)).toThrow(TypeError);
    const arr: unknown[] = [];
    arr.push(arr);
    expect(() => canonicalize(arr)).toThrow(/cyclic/);
    const shared = { x: 1 };
    expect(canonicalize({ a: shared, b: [shared, shared] })).toBe('{"a":{"x":1},"b":[{"x":1},{"x":1}]}');
  });

  it("does not Unicode-normalise strings (documented)", () => {
    expect(canonicalize("é")).not.toBe(canonicalize("é"));
  });

  it("escapes strings exactly like JSON", () => {
    expect(canonicalize({ s: 'quote " and  ' })).toBe(JSON.stringify({ s: 'quote " and  ' }));
  });
});
