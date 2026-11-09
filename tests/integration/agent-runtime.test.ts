import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase, organizations, purchaseRequests, toolExecutions, users, type DatabaseHandle } from "@qm/database";
import { AGENT_TOOLS, AgentBudgetExceeded, AgentRun } from "../../apps/api/src/services/agent/runtime";
import { deterministicExplanation } from "../../apps/api/src/services/agent/llm";

let handle: DatabaseHandle;
let orgId: string;
let requestId: string;

beforeAll(async () => {
  handle = await createDatabase({ url: "pglite://memory" });
  await handle.migrate();
  const [org] = await handle.db.insert(organizations).values({ name: "Agent Test Org" }).returning();
  const [user] = await handle.db.insert(users).values({ email: "agent-test@example.com", name: "T", passwordHash: "x" }).returning();
  const [req] = await handle.db
    .insert(purchaseRequests)
    .values({ organizationId: org!.id, createdBy: user!.id, instruction: "test", currency: "USD" })
    .returning();
  orgId = org!.id;
  requestId = req!.id;
});
afterAll(async () => {
  await handle.close();
});

const start = (limits: Partial<{ maxToolCalls: number; maxResearchCalls: number; deadlineMs: number; tokenBudget: number }> = {}) =>
  AgentRun.start(handle.db, {
    organizationId: orgId,
    requestId,
    kind: "TEST",
    limits: { maxToolCalls: 10, maxResearchCalls: 2, deadlineMs: 10_000, tokenBudget: 1_000, ...limits },
  });

describe("agent runtime", () => {
  it("exposes no payment, approval or capture tool", () => {
    for (const t of AGENT_TOOLS) expect(t).not.toMatch(/pay|capture|approve|refund|checkout|order\.create/i);
  });

  it("refuses tools outside the allowlist", async () => {
    const run = await start();
    await expect(
      run.tool(
        "payments.capture" as never,
        {},
        async () => 1,
        () => "x",
      ),
    ).rejects.toThrow(/not allowlisted/);
  });

  it("records every tool execution with its outcome", async () => {
    const run = await start();
    await run.tool(
      "forecast.compute",
      { a: 1 },
      async () => 42,
      (r) => `got ${r}`,
    );
    await expect(
      run.tool(
        "planner.plan",
        {},
        async () => {
          throw new Error("boom");
        },
        () => "never",
      ),
    ).rejects.toThrow("boom");
    await run.skip("market.search", "disabled");
    await run.finish("SUCCEEDED");
    const rows = await handle.db.select().from(toolExecutions).where(eq(toolExecutions.agentRunId, run.id));
    expect(rows.map((r) => [r.tool, r.status])).toEqual([
      ["forecast.compute", "SUCCEEDED"],
      ["planner.plan", "FAILED"],
      ["market.search", "SKIPPED"],
    ]);
    expect(rows[1]!.error).toBe("boom");
  });

  it("enforces the research call limit", async () => {
    const run = await start({ maxResearchCalls: 2 });
    await run.tool(
      "market.search",
      {},
      async () => 1,
      () => "1",
    );
    await run.tool(
      "market.search",
      {},
      async () => 2,
      () => "2",
    );
    await expect(
      run.tool(
        "market.search",
        {},
        async () => 3,
        () => "3",
      ),
    ).rejects.toBeInstanceOf(AgentBudgetExceeded);
  });

  it("enforces the total tool call limit and the deadline", async () => {
    const run = await start({ maxToolCalls: 1 });
    await run.tool(
      "forecast.compute",
      {},
      async () => 1,
      () => "ok",
    );
    await expect(
      run.tool(
        "forecast.compute",
        {},
        async () => 1,
        () => "ok",
      ),
    ).rejects.toBeInstanceOf(AgentBudgetExceeded);
    const late = await start({ deadlineMs: -1 });
    await expect(
      late.tool(
        "forecast.compute",
        {},
        async () => 1,
        () => "ok",
      ),
    ).rejects.toThrow(/deadline/);
  });

  it("tracks the token budget", async () => {
    const run = await start({ tokenBudget: 1_000 });
    expect(run.canSpendTokens(900)).toBe(true);
    run.addTokens(600);
    expect(run.canSpendTokens(500)).toBe(false);
    expect(run.tokensUsed).toBe(600);
  });
});

describe("deterministic explanation", () => {
  it("summarises compliant proposals and always states TrustRail blocks", () => {
    const e = deterministicExplanation({
      intent_notes: "",
      demand_multiplier: 1.25,
      proposals: [
        {
          supplier: "Harbor",
          total_minor: 17_320,
          decision: "REVIEW_REQUIRED",
          violations: ["MARKET_REFERENCE_UNAVAILABLE"],
          lines: ["2 × Containers"],
        },
      ],
      blocked: [{ supplier: "QuickServe", reasons: ["Charge is not part of the published terms.", "Listing quarantined."] }],
      unfilled_items: ["Gloves"],
      market_status: [],
    });
    expect(e.summary).toBe("Recommend 1 order totalling $173.20: Harbor ($173.20).");
    expect(e.rationale).toContain("TrustRail blocked QuickServe: Charge is not part of the published terms; Listing quarantined.");
    expect(e.rationale.some((r) => r.includes("25% above"))).toBe(true);
    expect(e.rationale.some((r) => r.includes("Gloves"))).toBe(true);
  });
});
