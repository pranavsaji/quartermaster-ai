import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, organizations, purchaseRequests, users, type DatabaseHandle } from "@qm/database";
import { OpenAIClient } from "@qm/integrations";
import { AgentBudgetExceeded, AgentRun } from "../../apps/api/src/services/agent/runtime";
import { interpretInstruction } from "../../apps/api/src/services/agent/llm";

let handle: DatabaseHandle;
let orgId: string;
let requestId: string;

beforeAll(async () => {
  handle = await createDatabase({ url: "pglite://memory" });
  await handle.migrate();
  const [org] = await handle.db.insert(organizations).values({ name: "Deadline Org" }).returning();
  const [user] = await handle.db.insert(users).values({ email: "deadline@example.com", name: "D", passwordHash: "x" }).returning();
  const [req] = await handle.db.insert(purchaseRequests).values({ organizationId: org!.id, createdBy: user!.id, instruction: "t", currency: "USD" }).returning();
  orgId = org!.id;
  requestId = req!.id;
});
afterAll(async () => {
  await handle.close();
});

const start = (deadlineMs: number) => AgentRun.start(handle.db, { organizationId: orgId, requestId, kind: "TEST", limits: { maxToolCalls: 10, maxResearchCalls: 2, deadlineMs, tokenBudget: 10_000 } });

/** A model endpoint that never answers unless the request is aborted. */
let aborted = 0;
const hangingFetch: typeof fetch = (_u, init) =>
  new Promise((_r, reject) =>
    init?.signal?.addEventListener("abort", () => {
      aborted++;
      reject(new DOMException("aborted", "AbortError"));
    }),
  );

describe("agent run deadline", () => {
  it("exposes an AbortSignal that fires at the deadline", async () => {
    const run = await start(50);
    expect(run.signal.aborted).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(run.signal.aborted).toBe(true);
    await expect(run.tool("forecast.compute", {}, async () => 1, () => "x")).rejects.toBeInstanceOf(AgentBudgetExceeded);
  });

  it("aborts an in-flight model call at the deadline and falls back deterministically", async () => {
    const openai = new OpenAIClient({ apiKey: "k", model: "m", fetch: hangingFetch, timeoutMs: 20_000 });
    const run = await start(150);
    const started = Date.now();
    const r = await interpretInstruction(openai, run, { instruction: "Restock gloves", inventory: [], today: "2026-01-01", now: new Date() });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(r.mode).toBe("DETERMINISTIC_FALLBACK");
    expect(aborted).toBe(1);
  });
});
