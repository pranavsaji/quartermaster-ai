import { describe, expect, it } from "vitest";
import { containsWebAddress, SignupRequest } from "@qm/contracts";
import { weakPasswordReason } from "@qm/database";
import { isRun } from "../../packages/database/src/password-strength";
import { loadConfig } from "../../apps/api/src/config";
import { sampleResetDue } from "../../apps/api/src/services/sample-workspace";

describe("weakPasswordReason", () => {
  it.each([
    ["password1234", "COMMON"],
    ["P@ssw0rd2026!", "COMMON"],
    ["iloveyou2024!!", "COMMON"],
    ["qwertyuiop12", "COMMON"],
    ["Quartermaster1!", "COMMON"],
    ["dragon-dragon-dragon", "COMMON"],
    ["123456789012", "PATTERN"],
    ["aaaaaaaaaaaa", "PATTERN"],
    ["abcabcabcabc", "PATTERN"],
    ["abcdefghijkl", "PATTERN"],
    ["lkjhgfdsapoiu", "PATTERN"],
  ] as const)("refuses %s (%s)", (password, reason) => {
    expect(weakPasswordReason(password)).toBe(reason);
  });

  it("refuses passwords made from the person's own details", () => {
    expect(weakPasswordReason("jane.doe2026!", ["jane.doe@example.com", "Jane Doe"])).toBe("PERSONAL");
    expect(weakPasswordReason("Saffronbistro!!", ["owner@example.com", "Saffron Bistro"])).toBe("PERSONAL");
  });

  it.each([
    "correct horse battery staple",
    "violet-harbor-lantern",
    "integration-test-password",
    "e2e-strong-password-2026",
    "t7#Qm9!vL2@x",
  ])("accepts %s", (password) => {
    expect(weakPasswordReason(password, ["someone@example.com", "Some One"])).toBeNull();
  });

  it("recognises keyboard and alphabet runs, with digit wrap-around", () => {
    expect(isRun("890123")).toBe(true);
    expect(isRun("zyxwvu")).toBe(true);
    expect(isRun("13579")).toBe(false);
    expect(isRun("abc")).toBe(false);
  });
});

describe("names cannot carry web addresses", () => {
  it.each(["https://x.io", "www.example", "paypal-help.com", "login.secure-pay.net/verify", "visit shop.example.co"])("flags %s", (v) => {
    expect(containsWebAddress(v)).toBe(true);
  });
  it.each(["Saffron & Sage Kitchen", "St. Louis Café", "Joe's Diner No. 2", "A.B.C. Supplies"])("allows %s", (v) => {
    expect(containsWebAddress(v)).toBe(false);
  });
  it("caps workspace names at 80 characters", () => {
    const base = { name: "A", email: "a@example.com", password: "a-long-enough-pass" };
    expect(SignupRequest.safeParse({ ...base, organization_name: "x".repeat(80) }).success).toBe(true);
    expect(SignupRequest.safeParse({ ...base, organization_name: "x".repeat(81) }).success).toBe(false);
  });
});

describe("sampleResetDue", () => {
  const at = (iso: string) => new Date(iso);
  it("is due once the scheduled hour has passed since the last reset", () => {
    expect(sampleResetDue(at("2026-03-12T02:59:00Z"), 3, at("2026-03-11T10:00:00Z"))).toBe(false);
    expect(sampleResetDue(at("2026-03-12T03:00:00Z"), 3, at("2026-03-11T10:00:00Z"))).toBe(true);
    expect(sampleResetDue(at("2026-03-12T09:00:00Z"), 3, at("2026-03-12T03:00:01Z"))).toBe(false);
  });
  it("catches up after a missed night", () => {
    expect(sampleResetDue(at("2026-03-14T01:00:00Z"), 3, at("2026-03-11T10:00:00Z"))).toBe(true);
  });
});

describe("security configuration", () => {
  const base = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

  it("protects the sample workspace and caps paid research by default", () => {
    const s = loadConfig(base).security;
    expect(s).toMatchObject({
      edgeSecret: null,
      sampleReadOnly: true,
      sampleResetHourUtc: null,
      research: { dailyRunsPerOrg: 40, dailyRunsGlobal: 600, dailyTokensGlobal: 6_000_000 },
      invitesPerHour: 20,
      invitesPerDay: 100,
      redTeamPerUserPerMinute: 30,
      redTeamPerOrgPerMinute: 120,
      sessionIdleMinutes: 120,
      webhookVerifyPerMinute: 300,
    });
  });

  it("keeps the test suite unconstrained unless a test opts in", () => {
    const s = loadConfig({ NODE_ENV: "test" }).security;
    expect(s.sampleReadOnly).toBe(false);
    expect(s.sessionIdleMinutes).toBe(0);
    expect(loadConfig({ NODE_ENV: "test", SAMPLE_WORKSPACE_READONLY: "true" }).security.sampleReadOnly).toBe(true);
  });

  it("validates the new settings", () => {
    expect(() => loadConfig({ ...base, EDGE_SECRET: "short" })).toThrow(/EDGE_SECRET/);
    expect(() => loadConfig({ ...base, SAMPLE_RESET_HOUR_UTC: "24" })).toThrow(/SAMPLE_RESET_HOUR_UTC/);
    expect(loadConfig({ ...base, SAMPLE_RESET_HOUR_UTC: "4", SESSION_IDLE_MINUTES: "0" }).security).toMatchObject({
      sampleResetHourUtc: 4,
      sessionIdleMinutes: 0,
    });
  });
});
