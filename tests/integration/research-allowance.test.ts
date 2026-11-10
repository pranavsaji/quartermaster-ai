import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type { ProcurementRequestDto } from "@qm/contracts";
import { systemErrors, usageCounters } from "@qm/database";
import { ALLOWANCE_NOTE, recordModelTokens } from "../../apps/api/src/services/usage";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { fakeChannel3 } from "../helpers/channel3";
import { createRequest, research, RESTOCK, setStock } from "../helpers/flows";

/**
 * Daily caps on paid services: past RESEARCH_DAILY_RUNS_PER_ORG (here 1) research still works, on
 * the deterministic fallback, without calling OpenAI or Channel3, and says so in its steps.
 */
let h: Harness;
let owner: Client;
const channel3 = fakeChannel3();
let openaiCalls = 0;

beforeAll(async () => {
  h = await createHarness({
    channel3Fetch: channel3.fetch,
    // Any model answer will do: these tests count calls, and a 500 makes each step fall back.
    openaiFetch: async () => {
      openaiCalls++;
      return new Response(JSON.stringify({ error: { message: "unavailable" } }), { status: 500 });
    },
    extraEnv: { RESEARCH_DAILY_RUNS_PER_ORG: "1", RESEARCH_DAILY_RUNS_GLOBAL: "50", RESEARCH_DAILY_TOKENS_GLOBAL: "1000000" },
  });
  owner = await h.agent("owner");
});
afterAll(async () => {
  await h.close();
});

async function restock(sku: string) {
  await setStock(owner, sku, sku === "ING-CANOLA" ? 10 : 5);
  const created = await createRequest(owner, RESTOCK[sku]!);
  return research(owner, created.id);
}

const steps = (r: ProcurementRequestDto) => r.agent_steps;

describe("daily research allowance", () => {
  it("uses paid services within the allowance", async () => {
    const before = channel3.calls.length;
    const r = await restock("CLN-GLOVES");
    expect(channel3.calls.length).toBeGreaterThan(before);
    expect(steps(r).some((s) => s.summary === ALLOWANCE_NOTE)).toBe(false);
  });

  it("falls back to deterministic research past the per-organisation cap, and says so", async () => {
    const c3 = channel3.calls.length;
    const r = await restock("CLN-TOWELS");
    const ai = openaiCalls;
    expect(channel3.calls.length).toBe(c3);
    expect(steps(r)).toContainEqual(expect.objectContaining({ tool: "market.search", status: "SKIPPED", summary: ALLOWANCE_NOTE }));
    expect(r.proposals.length).toBeGreaterThan(0);

    // Interpreting a new request is a model call too: also deterministic now.
    const created = await createRequest(owner, RESTOCK["PKG-NAPKINS"]!);
    expect(openaiCalls).toBe(ai);
    expect(created.intent?.ai_mode).toBe("DETERMINISTIC_FALLBACK");

    const orgId = (await owner.get("/auth/me")).body.user.organization.id as string;
    const [org] = await h.ctx.db
      .select()
      .from(usageCounters)
      .where(and(eq(usageCounters.scope, `org:${orgId}`)));
    expect(org!.researchRuns).toBe(2);
  });

  it("warns operators once per day per cap", async () => {
    await restock("PKG-NAPKINS");
    const rows = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "USAGE_DAILY_CAP_REACHED"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ level: "warning", occurrences: 1 });
  });

  it("restores paid research the next UTC day", async () => {
    const saved = h.clock.now;
    try {
      h.clock.now = new Date(saved.getTime() + 86_400_000);
      owner = await h.agent("owner"); // sessions last 12 hours
      const c3 = channel3.calls.length;
      const r = await restock("PKG-TAKEOUT-32");
      expect(channel3.calls.length).toBeGreaterThan(c3);
      expect(steps(r).some((s) => s.summary === ALLOWANCE_NOTE)).toBe(false);
    } finally {
      h.clock.now = saved;
    }
  });

  it("stops paid calls platform-wide once the global token cap is reached", async () => {
    const saved = h.clock.now;
    try {
      h.clock.now = new Date(saved.getTime() + 2 * 86_400_000);
      owner = await h.agent("owner");
      const orgId = (await owner.get("/auth/me")).body.user.organization.id as string;
      await recordModelTokens(h.ctx, orgId, 1_000_000);
      const c3 = channel3.calls.length;
      const r = await restock("ING-CANOLA");
      expect(channel3.calls.length).toBe(c3);
      expect(steps(r).some((s) => s.summary === ALLOWANCE_NOTE)).toBe(true);
    } finally {
      h.clock.now = saved;
    }
  });
});
