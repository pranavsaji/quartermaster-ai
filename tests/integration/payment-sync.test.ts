import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedOrder, receiveAll, relaxMandate } from "../helpers/flows";

/**
 * PayPal's JS SDK can report a cancel although the buyer approved (for example when its window
 * was relaunched). POST /payments/:id/sync lets the owner's browser ask what PayPal recorded,
 * without ever capturing, so an approved order is never left stranded.
 */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
});
afterEach(() => h.paypal.reset());
afterAll(async () => {
  await h.close();
});

describe("payment sync", () => {
  it("records a buyer approval PayPal saw but the browser missed, and never captures", async () => {
    const o = await approvedOrder(owner, "CLN-GLOVES");

    // Nothing approved yet: the payment is unchanged.
    const before = await owner.post(`/payments/${o.paymentId}/sync`);
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ id: o.paymentId, status: "ORDER_CREATED" });

    h.paypal.approve(o.paypalOrderId);
    const synced = await owner.post(`/payments/${o.paymentId}/sync`);
    expect(synced.status).toBe(200);
    expect(synced.body).toMatchObject({ status: "PAYER_APPROVED", paypal_order_id: o.paypalOrderId });
    expect(h.paypal.captureCount).toBe(0);

    // Syncing again is harmless, and the owner can then complete the payment as usual.
    expect((await owner.post(`/payments/${o.paymentId}/sync`)).body.status).toBe("PAYER_APPROVED");
    const captured = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(captured.status).toBe(200);
    expect(captured.body.payment.status).toBe("COMPLETED");
    expect(h.paypal.captureCount).toBe(1);

    // A completed payment stays completed.
    expect((await owner.post(`/payments/${o.paymentId}/sync`)).body.status).toBe("COMPLETED");
    await receiveAll(owner, (await owner.get(`/purchase-orders/${o.proposal.id}`)).body);
  });

  it("is owner-only and tenant-scoped", async () => {
    const manager = await h.agent("manager");
    const o = await approvedOrder(owner, "CLN-TOWELS");
    expect((await manager.post(`/payments/${o.paymentId}/sync`)).status).toBe(403);
    expect((await owner.post("/payments/00000000-0000-4000-8000-000000000000/sync")).status).toBe(404);
  });
});
