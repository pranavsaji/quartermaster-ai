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

  it("rejects malformed and unsafe amounts", () => {
    expect(() => decimalStringToMinor("1e3", "USD")).toThrow();
    expect(() => minorToDecimalString(1.5, "USD")).toThrow();
    expect(() => minorToDecimalString(1, "XXX")).toThrow();
  });

  it("converts floats from external sources without binary drift", () => {
    expect(floatToMinor(19.99, "USD")).toBe(1999);
    expect(floatToMinor(0.1 + 0.2, "USD")).toBe(30);
  });

  it("computes basis points with half-up rounding", () => {
    expect(applyBps(16_000, 825)).toBe(1_320);
    expect(applyBps(10_800, 825)).toBe(891);
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
