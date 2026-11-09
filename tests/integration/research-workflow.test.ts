import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { agentRuns, purchaseRequests } from "@qm/database";
import type { ProcurementRequestDto } from "@qm/contracts";
import { AppError } from "../../apps/api/src/errors";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";
import { createRequest, inventoryItem, relaxMandate, research, setStock } from "../helpers/flows";

/** The research workflow's outcomes other than the happy path: nothing to buy, caps, no re-planning, crashes. */
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

const live = (r: ProcurementRequestDto) => r.proposals.filter((p) => p.status === "PROPOSED");

describe("research outcomes", () => {
  it("proposes nothing when stock is above the reorder point", async () => {
    await setStock(owner, "PKG-NAPKINS", 100_000);
    const created = await createRequest(owner, "Restock dinner napkins");
    const r = await research(owner, created.id);
    expect(r.status).toBe("BLOCKED");
    expect(r.proposals).toHaveLength(0);
    expect(r.recommendation!.summary).toMatch(/no purchase is needed/i);
    expect(r.agent_steps.some((s) => s.tool === "planner.plan" && s.status === "SKIPPED")).toBe(true);
  });

  it("trims carts to the owner's cap, dropping the item with the most days of cover first", async () => {
    await setStock(owner, "PKG-TAKEOUT-32", 150);
    await setStock(owner, "ING-CANOLA", 1);
    const uncapped = await research(owner, (await createRequest(owner, DEMO_INSTRUCTION.replace(" without exceeding $300", ""))).id);
    const full = live(uncapped).reduce((a, p) => a + p.total_minor, 0);
    const oil = await inventoryItem(owner, "ING-CANOLA");
    const containers = await inventoryItem(owner, "PKG-TAKEOUT-32");
    const items = (r: ProcurementRequestDto) => live(r).flatMap((p) => p.items.map((i) => i.inventory_item_id).filter(Boolean));
    expect(items(uncapped)).toEqual(expect.arrayContaining([oil.id, containers.id]));
    const oilOnly = live(uncapped).find((p) => p.items.some((i) => i.inventory_item_id === oil.id))!;

    // A cap between the oil cart and the full plan keeps the urgent oil and drops the containers.
    const cap = oilOnly.total_minor + 100;
    expect(cap).toBeLessThan(full);
    const capped = await research(
      owner,
      (await createRequest(owner, "Restock takeaway containers and cooking oil", { budget_limit_minor: cap, required_by: "2099-12-31" }))
        .id,
    );
    expect(capped.budget_limit_minor).toBe(cap);
    expect(capped.required_by).toBe("2099-12-31");
    expect(live(capped).reduce((a, p) => a + p.total_minor, 0)).toBeLessThanOrEqual(cap);
    expect(items(capped)).toContain(oil.id);
    expect(items(capped)).not.toContain(containers.id);

    // A cap below any single cart leaves nothing compliant to propose.
    const tiny = await research(
      owner,
      (await createRequest(owner, "Restock takeaway containers and cooking oil", { budget_limit_minor: 100 })).id,
    );
    expect(live(tiny)).toHaveLength(0);
    expect(tiny.status).toBe("BLOCKED");
  });

  it("does not re-plan around a blocked supplier when alternatives are not allowed", async () => {
    await setStock(owner, "PKG-TAKEOUT-32", 120);
    const withAlternatives = await research(owner, (await createRequest(owner, DEMO_INSTRUCTION)).id);
    const strict = await research(owner, (await createRequest(owner, DEMO_INSTRUCTION, { allow_alternatives: false })).id);
    expect(strict.allow_alternatives).toBe(false);
    const attempts = (r: ProcurementRequestDto) => r.agent_steps.filter((s) => s.tool === "planner.plan").length;
    expect(withAlternatives.proposals.some((p) => p.status === "BLOCKED")).toBe(true);
    expect(attempts(withAlternatives)).toBeGreaterThan(1);
    expect(strict.proposals.some((p) => p.status === "BLOCKED")).toBe(true);
    expect(attempts(strict)).toBe(1);
    expect(strict.proposals.some((p) => p.status === "SUPERSEDED")).toBe(false);
  });
});

describe("research failures", () => {
  /** Lets the claim transaction through, then fails the next one (a crash mid-research). */
  function failNextTransactionAfterClaim(err: Error) {
    const real = h.ctx.db.transaction.bind(h.ctx.db);
    let calls = 0;
    vi.spyOn(h.ctx.db, "transaction").mockImplementation((fn: Parameters<typeof real>[0]) => {
      calls++;
      if (calls === 1) return real(fn);
      return Promise.reject(err);
    });
  }

  it("marks the request FAILED with a client-safe message, closes the agent run and allows a retry", async () => {
    await setStock(owner, "CLN-GLOVES", 5);
    const created = await createRequest(owner, "Restock nitrile gloves");
    failNextTransactionAfterClaim(new Error("could not write block 1234 of relation base/16384/2619"));
    vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("16384");
    vi.restoreAllMocks();

    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, created.id));
    expect(row!.status).toBe("FAILED");
    expect(row!.error).toBe("Research failed unexpectedly. Try again.");
    const runs = await h.ctx.db.select().from(agentRuns).where(eq(agentRuns.requestId, created.id));
    expect(runs.filter((r) => r.kind === "RESEARCH").map((r) => r.status)).toEqual(["FAILED"]);

    const retry = await research(owner, created.id);
    expect(retry.status).toBe("READY_FOR_REVIEW");
  });

  it("keeps an application error's message, which is safe to show", async () => {
    await setStock(owner, "CLN-TOWELS", 5);
    const created = await createRequest(owner, "Restock paper towels");
    failNextTransactionAfterClaim(new AppError(409, "CATALOG_BUSY", "Supplier catalogs are being refreshed."));
    vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CATALOG_BUSY");
    vi.restoreAllMocks();
    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, created.id));
    expect(row!.status).toBe("FAILED");
    expect(row!.error).toBe("Supplier catalogs are being refreshed.");
  });
});
