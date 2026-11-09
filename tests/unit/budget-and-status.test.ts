import { describe, expect, it } from "vitest";
import { mandateTightened } from "@qm/trustrail";
import { budgetPeriod, localDate, remaining } from "../../apps/api/src/services/budget";
import { deriveRequestStatus } from "../../apps/api/src/services/procurement/status";
import { toHashable } from "../../apps/api/src/services/audit";
import { loadConfig } from "../../apps/api/src/config";
import { mandate } from "../helpers/fixtures";

describe("budget periods", () => {
  it("runs Monday–Sunday in the organization's time zone", () => {
    // Sunday evening in Los Angeles is already Monday in UTC.
    const t = new Date("2026-11-09T05:30:00Z");
    expect(localDate(t, "America/Los_Angeles")).toEqual({ date: "2026-11-08", weekday: 7 });
    expect(budgetPeriod(t, "America/Los_Angeles")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(budgetPeriod(t, "UTC")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
  });

  it("computes remaining capacity net of reservations and spend", () => {
    expect(remaining({ limitMinor: 50_000, reservedMinor: 17_320, spentMinor: 10_500 })).toBe(22_180);
  });
});

describe("mandate tightening", () => {
  it.each([
    ["lower weekly budget", { weekly_budget_minor: 40_000 }],
    ["lower per-order limit", { per_order_limit_minor: 10_000 }],
    ["removed supplier", { approved_supplier_ids: [] }],
    ["removed category", { allowed_categories: ["food_packaging" as const] }],
    ["stricter market action", { market_price_action: "BLOCK" as const }],
    ["longer duplicate window", { duplicate_window_hours: 48 }],
    ["shorter certificate TTL", { certificate_ttl_minutes: 10 }],
    ["lower auto-approval limit", { auto_approval_limit_minor: 5_000 }],
  ])("treats %s as tightening", (_n, change) => {
    expect(mandateTightened(mandate(), mandate(change))).toBe(true);
  });

  it("does not treat loosening as tightening", () => {
    expect(mandateTightened(mandate(), mandate({ weekly_budget_minor: 80_000, max_market_price_premium_pct: 20 }))).toBe(false);
  });
});

describe("request status derivation", () => {
  it.each([
    [["PROPOSED", "BLOCKED"], "READY_FOR_REVIEW"],
    [["APPROVED", "BLOCKED"], "APPROVED"],
    [["PAYMENT_PENDING", "PAID"], "PAYMENT_PENDING"],
    [["PAID", "BLOCKED"], "PAID"],
    [["FULFILLED", "FULFILLED"], "FULFILLED"],
    [["BLOCKED", "SUPERSEDED"], "BLOCKED"],
    [["REJECTED"], "REJECTED"],
    [["EXPIRED"], "CANCELLED"],
  ])("%j → %s", (statuses, expected) => {
    expect(deriveRequestStatus(statuses, "DRAFT")).toBe(expected);
  });
});

describe("audit hashing helpers", () => {
  it("makes arbitrary data hashable without losing information", () => {
    expect(toHashable({ a: 1.25, b: new Date("2026-01-01T00:00:00Z"), c: undefined, d: [1, null] })).toEqual({ a: "1.25", b: "2026-01-01T00:00:00.000Z", d: [1, null] });
  });
});

describe("configuration", () => {
  it("refuses insecure production configuration", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "pglite://memory", TRUSTRAIL_SIGNING_KEY: "x" })).toThrow(/PGlite/);
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x", TRUSTRAIL_SIGNING_KEY: "x", PAYPAL_ENV: "live" })).toThrow(/Live PayPal/);
  });

  it("requires PayPal credentials in pairs and secures production cookies", () => {
    expect(() => loadConfig({ PAYPAL_CLIENT_ID: "only-id" })).toThrow();
    const prod = loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x", TRUSTRAIL_SIGNING_KEY: "x" });
    expect(prod.session.cookieSecure).toBe(true);
    expect(prod.session.cookieName).toBe("__Host-qm_session");
  });
});
