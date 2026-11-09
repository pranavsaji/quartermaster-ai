import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditEvents, policyDecisions, purchaseOrders, purchaseRequests } from "@qm/database";
import type { ProcurementRequestDto } from "@qm/contracts";
import { setOrderStatus } from "../../apps/api/src/services/order-status";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approve, currentMandate, proposed, relaxMandate, updateMandate } from "../helpers/flows";

/**
 * Evidence and guards around approval: a refused approval keeps its policy decision despite the
 * rollback, and a proposal is only approvable while its request is ready for review.
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

describe("approval evidence", () => {
  it("keeps the BLOCK decision and its input digest when TrustRail refuses an approval", async () => {
    const { request, proposal } = await proposed(owner, "CLN-GLOVES");
    const approved = (await currentMandate(owner)).approved_supplier_ids as string[];
    await updateMandate(owner, { approved_supplier_ids: approved.filter((id) => id !== proposal.supplier_id) });
    try {
      const res = await approve(owner, request.id, proposal);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("POLICY_BLOCKED");
    } finally {
      await updateMandate(owner, { approved_supplier_ids: approved });
    }

    const decisions = await h.ctx.db
      .select()
      .from(policyDecisions)
      .where(and(eq(policyDecisions.purchaseOrderId, proposal.id), eq(policyDecisions.stage, "APPROVE")));
    expect(decisions).toHaveLength(1);
    const [d] = decisions;
    expect(d!.decision).toBe("BLOCK");
    expect(d!.requestId).toBe(request.id);
    expect(d!.inputDigest).toMatch(/\S{16,}/);
    expect((d!.violations as { code: string }[]).map((v) => v.code)).toContain("SUPPLIER_NOT_APPROVED");

    // The audit entry points at the persisted decision and the same digest.
    const [audit] = await h.ctx.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, proposal.id), eq(auditEvents.action, "trustrail.approval_blocked")));
    expect(audit!.data).toMatchObject({ policy_decision_id: d!.id, input_digest: d!.inputDigest });

    // The latest decision on the order is the refusal.
    const after = (await owner.get(`/procurement/requests/${request.id}`)).body as ProcurementRequestDto;
    const p = after.proposals.find((x) => x.id === proposal.id)!;
    expect(p.status).toBe("BLOCKED");
    expect(p.policy_decision).toMatchObject({ id: d!.id, decision: "BLOCK", input_digest: d!.inputDigest });
  });

  it("records an allowed approval's decision once, inside the approval", async () => {
    const { request, proposal } = await proposed(owner, "CLN-TOWELS");
    const res = await approve(owner, request.id, proposal);
    expect(res.status).toBe(200);
    const decisions = await h.ctx.db
      .select()
      .from(policyDecisions)
      .where(and(eq(policyDecisions.purchaseOrderId, proposal.id), eq(policyDecisions.stage, "APPROVE")));
    expect(decisions).toHaveLength(1);
    expect(res.body.certificate.payload.policy_decision_id).toBe(decisions[0]!.id);
  });
});

describe("approvable request statuses", () => {
  it.each(["FAILED", "REJECTED", "CANCELLED", "BLOCKED"] as const)(
    "refuses to approve a proposal while its request is %s",
    async (status) => {
      const sku = { FAILED: "PKG-NAPKINS", REJECTED: "ING-CANOLA", CANCELLED: "PKG-TAKEOUT-32", BLOCKED: "PKG-NAPKINS" }[status];
      const { request, proposal } = await proposed(owner, sku);
      await h.ctx.db.update(purchaseRequests).set({ status }).where(eq(purchaseRequests.id, request.id));
      const res = await approve(owner, request.id, proposal);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: "REQUEST_NOT_APPROVABLE", details: { request_status: status } });
      const [po] = await h.ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, proposal.id));
      expect(po!.status).toBe("PROPOSED");
      // Leave nothing approvable behind for later tests on the same SKU.
      await h.ctx.db.update(purchaseOrders).set({ status: "SUPERSEDED" }).where(eq(purchaseOrders.id, proposal.id));
    },
  );
});

describe("setOrderStatus", () => {
  it("only moves an order out of the expected statuses and re-derives the request", async () => {
    const { request, proposal } = await proposed(owner, "CLN-GLOVES");
    const now = h.ctx.now();
    expect(await setOrderStatus(h.ctx.db, proposal.id, [], "REJECTED", now)).toBe(false);
    expect(await setOrderStatus(h.ctx.db, proposal.id, ["APPROVED"], "REJECTED", now)).toBe(false);
    expect(await setOrderStatus(h.ctx.db, proposal.id, ["PROPOSED"], "REJECTED", now)).toBe(true);
    const [po] = await h.ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, proposal.id));
    expect(po!.status).toBe("REJECTED");
    const [req] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, request.id));
    expect(req!.status).toBe("REJECTED");
  });
});
