import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditEvents, intentCertificates, policyDecisions, securityFindings } from "@qm/database";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedOrder, relaxMandate, updateMandate, currentMandate } from "../helpers/flows";

/** A refused capture keeps its evidence: the policy decision, a finding and an audit entry. */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
});
afterAll(async () => {
  await h.close();
});

describe("refused captures", () => {
  it("keeps the CAPTURE-stage policy decision when TrustRail blocks the capture", async () => {
    const o = await approvedOrder(owner, "CLN-GLOVES");
    h.paypal.approve(o.paypalOrderId);
    // Remove the supplier from the mandate without tightening-revocation reaching this payment:
    // the capture-time policy run then BLOCKs.
    const approved = (await currentMandate(owner)).approved_supplier_ids as string[];
    const [cert] = await h.ctx.db.select().from(intentCertificates).where(eq(intentCertificates.id, o.intentId));
    const supplierId = (cert!.payload as { supplier_id: string }).supplier_id;
    await h.ctx.db.update(intentCertificates).set({ status: "CONSUMED" }).where(eq(intentCertificates.id, o.intentId));
    await updateMandate(owner, { approved_supplier_ids: approved.filter((id) => id !== supplierId) });
    try {
      await h.ctx.db.update(intentCertificates).set({ status: "ACTIVE" }).where(eq(intentCertificates.id, o.intentId));

      const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("CAPTURE_REFUSED");

      const decisions = await h.ctx.db
        .select()
        .from(policyDecisions)
        .where(and(eq(policyDecisions.purchaseOrderId, o.proposal.id), eq(policyDecisions.stage, "CAPTURE")));
      expect(decisions).toHaveLength(1);
      expect(decisions[0]!.decision).toBe("BLOCK");
      const [audit] = await h.ctx.db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.entityId, o.paymentId), eq(auditEvents.action, "payment.capture_refused")));
      expect(audit!.data).toMatchObject({ policy_decision_id: decisions[0]!.id, input_digest: decisions[0]!.inputDigest });
    } finally {
      await updateMandate(owner, { approved_supplier_ids: approved });
    }
  });

  it("refuses, with a critical finding, to capture against an unreadable stored certificate", async () => {
    const o = await approvedOrder(owner, "CLN-TOWELS");
    h.paypal.approve(o.paypalOrderId);
    await h.ctx.db
      .update(intentCertificates)
      .set({ payload: { broken: true } })
      .where(eq(intentCertificates.id, o.intentId));
    const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CAPTURE_REFUSED");
    expect(h.paypal.captureCount).toBe(0);
    const findings = await h.ctx.db.select().from(securityFindings).where(eq(securityFindings.sourceId, o.paymentId));
    expect(findings.some((f) => f.severity === "CRITICAL" && f.title.includes("malformed"))).toBe(true);
  });
});
