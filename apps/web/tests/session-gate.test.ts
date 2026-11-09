import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/redirect";
import { loginRedirectFor } from "@/lib/session-gate";

describe("loginRedirectFor", () => {
  it("sends visitors without a session cookie to sign in, keeping where they were going", () => {
    expect(loginRedirectFor("/orders", "", false)).toBe("/login?next=%2Forders");
    expect(loginRedirectFor("/procurement/abc", "?research=1", false)).toBe("/login?next=%2Fprocurement%2Fabc%3Fresearch%3D1");
    expect(loginRedirectFor("/", "", false)).toBe("/login");
  });

  it("lets requests with a session cookie and the sign-in page through", () => {
    expect(loginRedirectFor("/orders", "", true)).toBeNull();
    expect(loginRedirectFor("/login", "?next=%2Forders", false)).toBeNull();
  });

  it("produces a next value that the login form accepts", () => {
    const url = new URL(loginRedirectFor("/security", "?tab=audit", false)!, "https://app.example");
    expect(safeNext(url.searchParams.get("next"), "https://app.example")).toBe("/security?tab=audit");
  });
});
