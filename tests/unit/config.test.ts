import { describe, expect, it } from "vitest";
import { loadConfig, parseTrustProxy } from "../../apps/api/src/config";

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
