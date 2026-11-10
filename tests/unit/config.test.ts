import { describe, expect, it } from "vitest";
import { loadConfig, parseTrustProxy } from "../../apps/api/src/config";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://db/x",
  TRUSTRAIL_SIGNING_KEY: "k",
  APP_BASE_URL: "https://app.example",
} as const;
const PAYPAL = { PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret" } as const;

describe("production configuration", () => {
  it("requires the webhook id and merchant id when PayPal is configured", () => {
    expect(() => loadConfig({ ...PROD, ...PAYPAL })).toThrow(/PAYPAL_WEBHOOK_ID and PAYPAL_MERCHANT_ID are missing/);
    expect(() => loadConfig({ ...PROD, ...PAYPAL, PAYPAL_WEBHOOK_ID: "WH" })).toThrow(/PAYPAL_MERCHANT_ID is missing/);
    expect(() => loadConfig({ ...PROD, ...PAYPAL, PAYPAL_MERCHANT_ID: "M" })).toThrow(/PAYPAL_WEBHOOK_ID is missing/);
    expect(loadConfig({ ...PROD, ...PAYPAL, PAYPAL_WEBHOOK_ID: "WH", PAYPAL_MERCHANT_ID: "M" }).paypal.merchantId).toBe("M");
    // Without PayPal, and outside production, they stay optional.
    expect(() => loadConfig({ ...PROD })).not.toThrow();
    expect(() => loadConfig({ ...PAYPAL })).not.toThrow();
  });

  it("defaults synthetic delivery actions off in production only", () => {
    expect(loadConfig({ ...PROD }).allowSyntheticDeliveryActions).toBe(false);
    expect(loadConfig({ ...PROD, ALLOW_SYNTHETIC_DELIVERY_ACTIONS: "true" }).allowSyntheticDeliveryActions).toBe(true);
    expect(loadConfig({}).allowSyntheticDeliveryActions).toBe(true);
    expect(loadConfig({ ALLOW_SYNTHETIC_DELIVERY_ACTIONS: "false" }).allowSyntheticDeliveryActions).toBe(false);
  });

  it("requires database TLS in production unless insecure transport is explicitly allowed", () => {
    expect(loadConfig({ ...PROD }).database.ssl).toBe(true);
    expect(() => loadConfig({ ...PROD, DATABASE_SSL: "disable" })).toThrow(/DATABASE_SSL=disable is refused/);
    expect(loadConfig({ ...PROD, DATABASE_SSL: "disable", DATABASE_ALLOW_INSECURE_TRANSPORT: "true" }).database.ssl).toBe(false);
    expect(loadConfig({}).database.ssl).toBe(false);
  });
});

describe("shutdown grace period", () => {
  it("defaults to 60s, longer than a research run", () => {
    expect(loadConfig({}).shutdownGraceMs).toBe(60_000);
    expect(loadConfig({ SHUTDOWN_GRACE_MS: "90000" }).shutdownGraceMs).toBe(90_000);
    expect(() => loadConfig({ SHUTDOWN_GRACE_MS: "-1" })).toThrow(/SHUTDOWN_GRACE_MS/);
  });
});

describe("TRUST_PROXY", () => {
  it("accepts a hop count", () => {
    expect(parseTrustProxy("0")).toBe(0);
    expect(parseTrustProxy("2")).toBe(2);
    expect(loadConfig({ TRUST_PROXY: "2" }).trustProxy).toBe(2);
    expect(loadConfig({}).trustProxy).toBe(0);
  });

  it("accepts a list of trusted proxy addresses and subnets", () => {
    expect(parseTrustProxy("10.0.0.0/8, 172.16.0.0/12,loopback")).toEqual(["10.0.0.0/8", "172.16.0.0/12", "loopback"]);
    expect(parseTrustProxy("fd00::/8,192.0.2.7")).toEqual(["fd00::/8", "192.0.2.7"]);
  });

  it("rejects permissive or malformed values", () => {
    expect(() => parseTrustProxy("true")).toThrow(/TRUST_PROXY/);
    expect(() => parseTrustProxy("6")).toThrow(/hop count/);
    expect(() => parseTrustProxy("10.0.0.0/33")).toThrow(/10\.0\.0\.0\/33/);
    expect(() => parseTrustProxy("example.com")).toThrow(/TRUST_PROXY/);
    expect(() => parseTrustProxy(" , ")).toThrow(/TRUST_PROXY/);
  });
});
