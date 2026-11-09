import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { forecastRuns, purchaseRequests } from "@qm/database";
import type { ProcurementRequestDto } from "@qm/contracts";
import type { PolicyResult } from "@qm/trustrail";
import { failClosedOnMalformedFacts, parseStoredIntent } from "../../apps/api/src/services/policy";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { createRequest, proposed, relaxMandate, setStock } from "../helpers/flows";

/**
 * Facts TrustRail reads from JSONB columns (market evidence, the interpreted intent, forecast
 * lines) are parsed, not cast. A malformed document makes the evaluation fail closed with a
 * BLOCK, never a TypeError or an ALLOW.
 */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await h.close();
});

async function reevaluate(requestId: string): Promise<ProcurementRequestDto> {
  const res = await owner.post(`/procurement/requests/${requestId}/evaluate`);
  expect(res.status).toBe(200);
  return res.body as ProcurementRequestDto;
}

function invalidFacts(r: ProcurementRequestDto, proposalId: string) {
  const p = r.proposals.find((x) => x.id === proposalId)!;
  expect(p.status).toBe("BLOCKED");
  const v = p.policy_decision!.violations.find((x) => x.code === "POLICY_INPUT_INVALID");
  expect(v, "a POLICY_INPUT_INVALID violation").toBeTruthy();
  return v!.evidence as { facts: string[] };
}

describe("malformed stored facts", () => {
  it.each([
    ["market", { market: [{ inventory_item_id: 42, status: "AVAILABLE" }] }],
    ["intent", { intent: { budget_limit_minor: "a lot" } }],
  ] as const)("blocks when the request's %s is malformed", async (fact, patch) => {
    const { request, proposal } = await proposed(owner, fact === "market" ? "CLN-GLOVES" : "CLN-TOWELS");
    await h.ctx.db
      .update(purchaseRequests)
      .set(patch as Partial<typeof purchaseRequests.$inferInsert>)
      .where(eq(purchaseRequests.id, request.id));
    const after = await reevaluate(request.id);
    expect(invalidFacts(after, proposal.id).facts).toEqual([fact]);
    expect(after.status).toBe("BLOCKED");
  });

  it("blocks when the forecast lines are malformed", async () => {
    const { request, proposal } = await proposed(owner, "PKG-NAPKINS");
    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, request.id));
    await h.ctx.db
      .update(forecastRuns)
      .set({ lines: [{ inventory_item_id: null, suggested_quantity: "many" }] })
      .where(eq(forecastRuns.id, row!.forecastRunId!));
    const after = await reevaluate(request.id);
    expect(invalidFacts(after, proposal.id).facts).toEqual(["forecast_lines"]);
  });

  it("refuses to research a request whose stored intent is malformed", async () => {
    await setStock(owner, "ING-CANOLA", 10);
    const created = await createRequest(owner, "Restock canola frying oil");
    await h.ctx.db
      .update(purchaseRequests)
      .set({ intent: { inventory_item_ids: "all of them" } })
      .where(eq(purchaseRequests.id, created.id));
    vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("REQUEST_INTENT_INVALID");
    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, created.id));
    expect(row!.status).toBe("FAILED");
  });
});

describe("stored-fact helpers", () => {
  it("treats a missing intent as empty and rejects malformed ones", () => {
    expect(parseStoredIntent(null)).toEqual({});
    expect(parseStoredIntent({ budget_limit_minor: 30_000, ai_mode: "LLM" })).toEqual({ budget_limit_minor: 30_000 });
    expect(parseStoredIntent({ budget_limit_minor: 1.5 })).toBeNull();
    expect(parseStoredIntent({ demand_multiplier: -1 })).toBeNull();
    expect(parseStoredIntent("nope")).toBeNull();
  });

  it("leaves a decision on well-formed facts untouched and turns any other into a BLOCK", () => {
    const allow: PolicyResult = {
      decision: "ALLOW",
      violations: [],
      checks: [],
      human_approval_required: false,
      mandate_version: 1,
      policy_version: "p",
      input_digest: "d",
      evaluated_at: "2026-01-01T00:00:00.000Z",
    };
    expect(failClosedOnMalformedFacts(allow, [])).toBe(allow);
    const blocked = failClosedOnMalformedFacts(allow, ["market"]);
    expect(blocked.decision).toBe("BLOCK");
    expect(blocked.human_approval_required).toBe(true);
    expect(blocked.violations.map((v) => v.code)).toEqual(["POLICY_INPUT_INVALID"]);
    expect(blocked.checks).toEqual([expect.objectContaining({ code: "REQUEST_FACTS_VALID", passed: false })]);
  });
});
