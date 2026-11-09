import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/redirect";

const ORIGIN = "https://app.example";

describe("safeNext", () => {
  it("keeps same-origin paths with their query and hash", () => {
    expect(safeNext("/orders", ORIGIN)).toBe("/orders");
    expect(safeNext("/procurement/abc?research=1#proposals", ORIGIN)).toBe("/procurement/abc?research=1#proposals");
    expect(safeNext("/security?q=a%20b", ORIGIN)).toBe("/security?q=a%20b");
  });

  it("falls back to / for missing or relative values", () => {
    expect(safeNext(null, ORIGIN)).toBe("/");
    expect(safeNext(undefined, ORIGIN)).toBe("/");
    expect(safeNext("", ORIGIN)).toBe("/");
    expect(safeNext("orders", ORIGIN)).toBe("/");
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "/%09/evil.example",
    "/%5Cevil.example",
    "/%2F/evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/ /evil.example",
    "/.//evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/%E0%A4%A",
  ])("rejects the open-redirect payload %j", (payload) => {
    expect(safeNext(payload, ORIGIN)).toBe("/");
  });

  it("never sends the user back to the login page", () => {
    expect(safeNext("/login", ORIGIN)).toBe("/");
    expect(safeNext("/login?next=/orders", ORIGIN)).toBe("/");
    expect(safeNext("/login/", ORIGIN)).toBe("/");
  });

  it("always returns a value that resolves to the same origin", () => {
    for (const value of ["/a/../b", "/./c", "/x?y=//evil.example"]) {
      const out = safeNext(value, ORIGIN);
      expect(new URL(out, ORIGIN).origin).toBe(ORIGIN);
      expect(out.startsWith("//")).toBe(false);
    }
  });
});
