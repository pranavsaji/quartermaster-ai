import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProcurementRequestDto } from "@qm/contracts";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";

let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
});
afterAll(async () => {
  await h.close();
});

async function researched(instruction = DEMO_INSTRUCTION): Promise<ProcurementRequestDto> {
  const created = await owner.post("/procurement/requests", { instruction });
  expect(created.status).toBe(201);
  const res = await owner.post(`/procurement/requests/${created.body.id}/research`);
  expect(res.status).toBe(200);
  return res.body as ProcurementRequestDto;
}

describe("rejecting proposals", () => {
  it("rejects only the named proposal and leaves the other supplier's cart open", async () => {
    const r = await researched();
    const open = r.proposals.filter((p) => p.status === "PROPOSED");
    expect(open.length).toBeGreaterThanOrEqual(2);
    const [target, other] = open;
    const res = await owner.post(`/procurement/requests/${r.id}/reject`, { reason: "Too expensive", purchase_order_id: target!.id });
    expect(res.status).toBe(200);
    const after = res.body as ProcurementRequestDto;
    expect(after.proposals.find((p) => p.id === target!.id)!.status).toBe("REJECTED");
    expect(after.proposals.find((p) => p.id === other!.id)!.status).toBe("PROPOSED");

    const again = await owner.post(`/procurement/requests/${r.id}/reject`, { reason: "Again", purchase_order_id: target!.id });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("PROPOSAL_NOT_OPEN");
  });

  it("rejects every open proposal when no proposal is named", async () => {
    const r = await researched();
    const res = await owner.post(`/procurement/requests/${r.id}/reject`, { reason: "Not this week" });
    expect(res.status).toBe(200);
    const after = res.body as ProcurementRequestDto;
    expect(after.proposals.filter((p) => p.status === "PROPOSED")).toHaveLength(0);
  });

  it("refuses a malformed proposal id", async () => {
    const r = await researched();
    const res = await owner.post(`/procurement/requests/${r.id}/reject`, { reason: "x", purchase_order_id: "not-a-uuid" });
    expect(res.status).toBe(400);
  });
});
