import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { agentRuns, purchaseOrders, purchaseRequests } from "@qm/database";
import type { ProcurementRequestDto } from "@qm/contracts";
import { planningReserveMs } from "../../apps/api/src/services/procurement/research";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";
import { approve, createRequest, relaxMandate, setStock } from "../helpers/flows";

/**
 * The research agent's deadline: slow optional stages degrade (market evidence is skipped, the
 * planning reserve is kept), and a deadline that still strikes mid-planning is a typed 503 that
 * leaves no approvable proposal behind.
 */

/** A Channel3 endpoint that, while `channel3Hangs` is set, never answers unless the request is aborted. */
let channel3Calls = 0;
let channel3Hangs = false;
const hangingChannel3: typeof fetch = async (_u, init) => {
  channel3Calls++;
  if (!channel3Hangs)
    return new Response(JSON.stringify({ products: [] }), { status: 200, headers: { "content-type": "application/json" } });
  return new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
};

let h: Harness;
let owner: Client;
let defaultDeadline: number;

beforeAll(async () => {
  h = await createHarness({ channel3Fetch: hangingChannel3 });
  owner = await h.agent("owner");
  await relaxMandate(owner);
  defaultDeadline = h.ctx.config.agent.deadlineMs;
});
afterEach(() => {
  vi.restoreAllMocks();
  h.ctx.config.agent.deadlineMs = defaultDeadline;
  channel3Hangs = false;
});
afterAll(async () => {
  await h.close();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("planning reserve", () => {
  it("holds back a third of the deadline, at most 15 seconds", () => {
    expect(planningReserveMs(3_000)).toBe(1_000);
    expect(planningReserveMs(45_000)).toBe(15_000);
    expect(planningReserveMs(120_000)).toBe(15_000);
  });
});

describe("research at the agent deadline", () => {
  it("skips market evidence that would eat the planning reserve and still proposes", async () => {
    vi.spyOn(h.ctx.log, "warn").mockImplementation(() => undefined);
    h.ctx.config.agent.deadlineMs = 6_000;
    await setStock(owner, "PKG-TAKEOUT-32", 120);
    await setStock(owner, "ING-CANOLA", 10);
    const created = await createRequest(owner, DEMO_INSTRUCTION);
    channel3Calls = 0;
    channel3Hangs = true;

    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(200);
    const r = res.body as ProcurementRequestDto;
    expect(["READY_FOR_REVIEW", "BLOCKED"]).toContain(r.status);
    // The first search hung until the reserve began; the remaining item was not searched.
    expect(channel3Calls).toBe(1);
    expect(r.market.every((m) => m.status !== "AVAILABLE")).toBe(true);
    const skipped = r.agent_steps.find((s) => s.tool === "market.search" && s.status === "SKIPPED");
    expect(skipped?.summary).toMatch(/ran out; skipped 1 item/);
    expect(r.agent_steps.some((s) => s.tool === "planner.plan" && s.status === "SUCCEEDED")).toBe(true);
    expect(r.agent_steps.some((s) => s.tool === "trustrail.evaluate" && s.status === "SUCCEEDED")).toBe(true);
    expect(r.proposals.length).toBeGreaterThan(0);
  });

  it("returns a retryable 503, marks the request FAILED and withdraws the run's proposals when the deadline strikes mid-planning", async () => {
    h.ctx.config.agent.deadlineMs = 2_000;
    await setStock(owner, "PKG-TAKEOUT-32", 120);
    await setStock(owner, "ING-CANOLA", 10);
    const created = await createRequest(owner, DEMO_INSTRUCTION);

    // The first TrustRail evaluation commits, then stalls past the deadline: the next step is refused.
    const real = h.ctx.db.transaction.bind(h.ctx.db);
    let stalled = false;
    vi.spyOn(h.ctx.db, "transaction").mockImplementation(async (fn: Parameters<typeof real>[0]) => {
      const result: unknown = await real(fn);
      const isEvaluation = typeof result === "object" && result !== null && "po" in result && "ev" in result;
      if (isEvaluation && !stalled) {
        stalled = true;
        await sleep(2_200);
      }
      return result;
    });
    vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    vi.spyOn(h.ctx.log, "warn").mockImplementation(() => undefined);

    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatchObject({ code: "AGENT_DEADLINE_EXCEEDED", details: { retryable: true } });
    vi.restoreAllMocks();

    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, created.id));
    expect(row!.status).toBe("FAILED");
    expect(row!.error).toBe(res.body.error.message);
    const orders = await h.ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.requestId, created.id));
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.map((o) => o.status).every((s) => s === "SUPERSEDED")).toBe(true);
    const runs = await h.ctx.db.select().from(agentRuns).where(eq(agentRuns.requestId, created.id));
    expect(runs.find((x) => x.kind === "RESEARCH")!.status).toBe("FAILED");

    // Nothing from the failed run can be approved.
    const seen = (await owner.get(`/procurement/requests/${created.id}`)).body as ProcurementRequestDto;
    const refused = await approve(owner, created.id, seen.proposals[0]!);
    expect(refused.status).toBe(409);

    // The request can be researched again once time allows.
    h.ctx.config.agent.deadlineMs = defaultDeadline;
    const retry = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(retry.status).toBe(200);
    expect(["READY_FOR_REVIEW", "BLOCKED"]).toContain((retry.body as ProcurementRequestDto).status);
  });
});
