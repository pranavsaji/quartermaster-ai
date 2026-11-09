import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { purchaseOrders, purchaseRequests } from "@qm/database";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";

/**
 * If the sweeper fails a research run as abandoned while it is in fact still running, the run
 * must not resurrect the request when it finishes: it reports the interruption and withdraws the
 * proposals it created.
 */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
});
afterAll(async () => {
  await h.ctx.db.execute(sql`drop trigger if exists qm_test_fail_research on tool_executions`);
  await h.close();
});

describe("interrupted research", () => {
  it("does not overwrite a FAILED status set while it was running, and withdraws its proposals", async () => {
    const created = await owner.post("/procurement/requests", { instruction: DEMO_INSTRUCTION });
    const id = created.body.id as string;
    // Simulate the sweeper: as soon as the explanation step is recorded, the request is failed.
    await h.ctx.db.execute(sql`
      create or replace function qm_test_fail_research() returns trigger language plpgsql as $$
      begin
        if new.tool = 'recommendation.explain' then
          update purchase_requests set status = 'FAILED', error = 'Research was interrupted. Run it again.'
          where status = 'RESEARCHING';
        end if;
        return new;
      end $$`);
    await h.ctx.db.execute(sql`
      create trigger qm_test_fail_research after insert on tool_executions
      for each row execute function qm_test_fail_research()`);
    try {
      const res = await owner.post(`/procurement/requests/${id}/research`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("RESEARCH_INTERRUPTED");
    } finally {
      await h.ctx.db.execute(sql`drop trigger if exists qm_test_fail_research on tool_executions`);
    }
    const [req] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    expect(req!.status).toBe("FAILED");
    const orders = await h.ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.requestId, id));
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every((o) => o.status === "SUPERSEDED")).toBe(true);
  });
});
