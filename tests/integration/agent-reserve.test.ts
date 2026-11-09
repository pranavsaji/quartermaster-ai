import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabase, organizations, purchaseRequests, users, type DatabaseHandle } from "@qm/database";
import { AgentRun } from "../../apps/api/src/services/agent/runtime";

/** AgentRun.reserve(): optional work stops where the reserved tail of the deadline begins. */
let handle: DatabaseHandle;
let orgId: string;
let requestId: string;

beforeAll(async () => {
  handle = await createDatabase({ url: "pglite://memory" });
  await handle.migrate();
  const [org] = await handle.db.insert(organizations).values({ name: "Reserve Org" }).returning();
  const [user] = await handle.db
    .insert(users)
    .values({ email: `reserve-${randomUUID()}@example.com`, name: "R", passwordHash: "x" })
    .returning();
  const [req] = await handle.db
    .insert(purchaseRequests)
    .values({ organizationId: org!.id, createdBy: user!.id, instruction: "t", currency: "USD" })
    .returning();
  orgId = org!.id;
  requestId = req!.id;
});
afterAll(async () => {
  await handle.close();
});

const start = (deadlineMs: number) =>
  AgentRun.start(handle.db, {
    organizationId: orgId,
    requestId,
    kind: "TEST",
    limits: { maxToolCalls: 10, maxResearchCalls: 2, deadlineMs, tokenBudget: 10_000 },
  });

describe("agent run reserve", () => {
  it("ends the optional-work budget and signal early, and restores them on release", async () => {
    const run = await start(60_000);
    const hard = run.signal;
    run.reserve(59_950);
    expect(run.budgetMs).toBeLessThanOrEqual(50);
    expect(run.remainingMs).toBeGreaterThan(50_000);
    // The reserved signal fires long before the hard deadline.
    await new Promise((resolve) => run.signal.addEventListener("abort", resolve, { once: true }));
    expect(run.signal.aborted).toBe(true);
    expect(hard.aborted).toBe(false);

    run.release();
    expect(run.signal).toBe(hard);
    expect(run.budgetMs).toBe(run.remainingMs);
    // Mandatory steps still run inside the reserved tail.
    await expect(
      run.tool(
        "planner.plan",
        {},
        async () => 1,
        () => "ok",
      ),
    ).resolves.toBe(1);
  });

  it("treats a zero reserve as none and never reserves more than the deadline", async () => {
    const run = await start(1_000);
    const hard = run.signal;
    run.reserve(0);
    expect(run.signal).toBe(hard);
    run.reserve(10_000);
    expect(run.budgetMs).toBeLessThanOrEqual(0);
  });
});
