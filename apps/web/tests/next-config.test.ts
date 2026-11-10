import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("next.config", () => {
  it("lets the /api proxy wait longer than a research run (Next's default is 30 s)", () => {
    // AGENT_DEADLINE_MS is at most 45 s by default and 120 s at the configured maximum.
    expect(nextConfig.experimental?.proxyTimeout).toBeGreaterThanOrEqual(120_000);
  });

  it("serves the versioned Bryntum module with an immutable cache header", async () => {
    const rules = (await nextConfig.headers!()) ?? [];
    const vendor = rules.find((r) => r.source.startsWith("/vendor/bryntum/:version"));
    expect(vendor?.headers).toContainEqual({ key: "Cache-Control", value: "public, max-age=31536000, immutable" });
  });

  it("loads Bryntum from the path of the installed version, so the immutable URL changes on upgrade", () => {
    const installed = (JSON.parse(read("../node_modules/@bryntum/scheduler/package.json")) as { version: string }).version;
    const view = read("../components/deliveries/BryntumScheduleView.tsx");
    expect(view).toContain(`const BRYNTUM_URL = "/vendor/bryntum/${installed}/scheduler.module.js";`);
  });
});
