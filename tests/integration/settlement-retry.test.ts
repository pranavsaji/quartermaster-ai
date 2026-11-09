import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";

/** Capture finalisation is retried when PostgreSQL aborts it for a deadlock. */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
});
afterAll(async () => {
  await h.close();
});

async function approvedOrder() {
  const created = await owner.post("/procurement/requests", { instruction: DEMO_INSTRUCTION });
  const r: ProcurementRequestDto = (await owner.post(`/procurement/requests/${created.body.id}/research`)).body;
  const p = r.proposals.find((x) => x.status === "PROPOSED") as PurchaseOrderDto;
  const approval = await owner.post(`/procurement/requests/${r.id}/approve`, {
    purchase_order_id: p.id,
    cart_hash: p.cart_hash,
    acknowledged_review_codes: p.policy_decision!.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code),
  });
  expect(approval.status).toBe(200);
  const order = await owner.post(`/intents/${approval.body.certificate.id}/paypal-order`);
  return { paymentId: order.body.payment.id as string, paypalOrderId: order.body.paypal_order_id as string };
}

describe("capture", () => {
  it("records a capture after retrying a deadlock while saving it", async () => {
    const o = await approvedOrder();
    h.paypal.approve(o.paypalOrderId);
    const realCapture = h.ctx.paypal.captureOrder.bind(h.ctx.paypal);
    const realTransaction = h.ctx.db.transaction.bind(h.ctx.db);
    h.ctx.paypal.captureOrder = async (...args) => {
      const res = await realCapture(...args);
      h.ctx.db.transaction = async () => {
        h.ctx.db.transaction = realTransaction;
        throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
      };
      return res;
    };
    try {
      const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
      expect(res.status).toBe(200);
      expect(res.body.payment.status).toBe("COMPLETED");
    } finally {
      h.ctx.paypal.captureOrder = realCapture;
      h.ctx.db.transaction = realTransaction;
    }
  });
});
