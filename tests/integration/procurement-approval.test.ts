import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditEvents, purchaseRequests, securityFindings, spendMandates } from "@qm/database";
import type { ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approve, createRequest, currentMandate, proposed, relaxMandate, updateMandate } from "../helpers/flows";

/**
 * Approval, re-evaluation and rejection of proposals: every refusal path the owner can hit, and
 * the request-status transitions they cause. Each test uses its own SKU (see helpers/flows.ts).
 */
let h: Harness;
let owner: Client;
let orgId: string;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
  orgId = (await owner.get("/auth/me")).body.user.organization.id;
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await h.close();
});

const UNKNOWN = "00000000-0000-4000-8000-000000000000";
const getRequest = async (id: string) => (await owner.get(`/procurement/requests/${id}`)).body as ProcurementRequestDto;
const proposalIn = (r: ProcurementRequestDto, id: string) => r.proposals.find((p) => p.id === id)!;

/** Temporarily removes a supplier from the mandate's approved list. */
async function withoutSupplier<T>(supplierId: string, fn: () => Promise<T>): Promise<T> {
  const approved = (await currentMandate(owner)).approved_supplier_ids as string[];
  await updateMandate(owner, { approved_supplier_ids: approved.filter((id) => id !== supplierId) });
  try {
    return await fn();
  } finally {
    await updateMandate(owner, { approved_supplier_ids: approved });
  }
}

describe("re-evaluating proposals", () => {
  it("blocks open proposals when the mandate tightens and reopens them when it relaxes", async () => {
    const { request, proposal } = await proposed(owner, "CLN-GLOVES");

    const blocked = await withoutSupplier(proposal.supplier_id, async () => {
      const res = await owner.post(`/procurement/requests/${request.id}/evaluate`);
      expect(res.status).toBe(200);
      return res.body as ProcurementRequestDto;
    });
    const p = proposalIn(blocked, proposal.id);
    expect(p.status).toBe("BLOCKED");
    expect(p.policy_decision!.violations.map((v) => v.code)).toContain("SUPPLIER_NOT_APPROVED");
    expect(blocked.status).toBe("BLOCKED");

    const reopened = (await owner.post(`/procurement/requests/${request.id}/evaluate`)).body as ProcurementRequestDto;
    expect(proposalIn(reopened, proposal.id).status).toBe("PROPOSED");
    expect(reopened.status).toBe("READY_FOR_REVIEW");

    const audit = await h.ctx.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, proposal.id), eq(auditEvents.action, "trustrail.cart_reevaluated")));
    expect(audit.length).toBeGreaterThanOrEqual(2);
  });

  it("refuses unknown requests and viewers", async () => {
    expect((await owner.post(`/procurement/requests/${UNKNOWN}/evaluate`)).status).toBe(404);
    const viewer = await h.agent("viewer");
    expect((await viewer.post(`/procurement/requests/${UNKNOWN}/evaluate`)).status).toBe(403);
  });
});

describe("approval refusals", () => {
  let request: ProcurementRequestDto;
  let proposal: PurchaseOrderDto;

  beforeAll(async () => {
    ({ request, proposal } = await proposed(owner, "ING-CANOLA"));
  });

  it("refuses a cart hash the owner did not review, telling the client the current one", async () => {
    const res = await approve(owner, request.id, proposal, { cart_hash: `sha256:${"0".repeat(64)}` });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CART_CHANGED");
    expect(res.body.error.details.current_cart_hash).toBe(proposal.cart_hash);
  });

  it("refuses unknown requests and proposals that belong to another request", async () => {
    expect((await approve(owner, UNKNOWN, proposal)).status).toBe(404);
    const other = await createRequest(owner, "Restock canola oil for the other request");
    expect((await approve(owner, other.id, proposal)).status).toBe(404);
  });

  it("refuses while research is running on the request", async () => {
    await h.ctx.db.update(purchaseRequests).set({ status: "RESEARCHING" }).where(eq(purchaseRequests.id, request.id));
    try {
      const res = await approve(owner, request.id, proposal);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("RESEARCH_IN_PROGRESS");
    } finally {
      await h.ctx.db.update(purchaseRequests).set({ status: "READY_FOR_REVIEW" }).where(eq(purchaseRequests.id, request.id));
    }
  });

  it("refuses when no mandate is active", async () => {
    const active = and(eq(spendMandates.organizationId, orgId), eq(spendMandates.status, "ACTIVE"));
    const [m] = await h.ctx.db.select().from(spendMandates).where(active);
    await h.ctx.db.update(spendMandates).set({ status: "SUPERSEDED" }).where(eq(spendMandates.id, m!.id));
    try {
      const res = await approve(owner, request.id, proposal);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("MANDATE_INACTIVE");
    } finally {
      await h.ctx.db.update(spendMandates).set({ status: "ACTIVE" }).where(eq(spendMandates.id, m!.id));
    }
  });

  it("blocks a cart the current mandate no longer allows and keeps the evidence despite the rollback", async () => {
    const res = await withoutSupplier(proposal.supplier_id, () => approve(owner, request.id, proposal));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("POLICY_BLOCKED");
    expect(res.body.error.details.violations.map((v: { code: string }) => v.code)).toContain("SUPPLIER_NOT_APPROVED");

    const after = await getRequest(request.id);
    expect(proposalIn(after, proposal.id).status).toBe("BLOCKED");
    expect(after.status).toBe("BLOCKED");
    const findings = await h.ctx.db
      .select()
      .from(securityFindings)
      .where(and(eq(securityFindings.sourceId, proposal.id), eq(securityFindings.type, "POLICY_VIOLATION")));
    expect(findings).toHaveLength(1);
    const audit = await h.ctx.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, proposal.id), eq(auditEvents.action, "trustrail.approval_blocked")));
    expect(audit).toHaveLength(1);

    // A blocked proposal cannot be approved, even with the supplier approved again.
    const again = await approve(owner, request.id, proposal);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("PROPOSAL_NOT_APPROVABLE");
  });
});

describe("rejecting requests", () => {
  it("rejects a request that never produced a proposal", async () => {
    const draft = await createRequest(owner, "Restock gloves, but we changed our mind");
    const res = await owner.post(`/procurement/requests/${draft.id}/reject`, { reason: "Not needed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
  });

  it("has nothing to reject once the only proposal is approved, and research can no longer run", async () => {
    const { request, proposal } = await proposed(owner, "CLN-TOWELS");
    for (const p of request.proposals.filter((x) => x.status === "PROPOSED" && x.id !== proposal.id)) {
      expect(
        (await owner.post(`/procurement/requests/${request.id}/reject`, { reason: "One is enough", purchase_order_id: p.id })).status,
      ).toBe(200);
    }
    const approved = await approve(owner, request.id, proposal, { note: "Approved in the test" });
    expect(approved.status).toBe(200);
    expect((await getRequest(request.id)).status).toBe("APPROVED");

    const reject = await owner.post(`/procurement/requests/${request.id}/reject`, { reason: "Too late" });
    expect(reject.status).toBe(409);
    expect(reject.body.error.code).toBe("NOTHING_TO_REJECT");

    const rerun = await owner.post(`/procurement/requests/${request.id}/research`);
    expect(rerun.status).toBe(409);
    expect(rerun.body.error.code).toBe("REQUEST_NOT_RESEARCHABLE");

    // Even if the request status were reset, an approved order still forbids re-research.
    await h.ctx.db.update(purchaseRequests).set({ status: "READY_FOR_REVIEW" }).where(eq(purchaseRequests.id, request.id));
    const forced = await owner.post(`/procurement/requests/${request.id}/research`);
    expect(forced.status).toBe(409);
    expect(forced.body.error.code).toBe("REQUEST_HAS_APPROVED_ORDERS");
    expect(proposalIn(await getRequest(request.id), proposal.id).status).toBe("APPROVED");

    // Re-evaluation leaves the approved order alone.
    const evaluated = (await owner.post(`/procurement/requests/${request.id}/evaluate`)).body as ProcurementRequestDto;
    expect(proposalIn(evaluated, proposal.id).status).toBe("APPROVED");
  });

  it("refuses unknown requests and non-owners", async () => {
    expect((await owner.post(`/procurement/requests/${UNKNOWN}/reject`, { reason: "x" })).status).toBe(404);
    const manager = await h.agent("manager");
    expect((await manager.post(`/procurement/requests/${UNKNOWN}/reject`, { reason: "x" })).status).toBe(403);
    expect((await owner.post(`/procurement/requests/${UNKNOWN}/reject`, {})).status).toBe(400);
  });
});

describe("listing requests", () => {
  it("summarises each request with the total of its live proposals", async () => {
    const draft = await createRequest(owner, "Restock napkins sometime");
    const { request } = await proposed(owner, "PKG-TAKEOUT-32");
    const res = await owner.get("/procurement/requests?limit=200");
    expect(res.status).toBe(200);
    const items = res.body.items as { id: string; total_minor: number | null; status: string }[];
    expect(items.find((i) => i.id === draft.id)!.total_minor).toBeNull();
    const live = request.proposals.filter((p) => !["SUPERSEDED", "BLOCKED", "REJECTED"].includes(p.status));
    expect(items.find((i) => i.id === request.id)!.total_minor).toBe(live.reduce((a, p) => a + p.total_minor, 0));
    // Researching an unknown request is a 404, not a crash.
    expect((await owner.post(`/procurement/requests/${UNKNOWN}/research`)).status).toBe(404);
  });
});
