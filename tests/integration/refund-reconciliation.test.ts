import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import request from "supertest";
import { budgetReservations, paymentAttempts, refunds, securityFindings } from "@qm/database";
import { sweep } from "../../apps/api/src/jobs/sweeper";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedOrder, paidOrder, receiveAll, relaxMandate } from "../helpers/flows";

/**
 * Refunds whose outcome was not known when the owner's request ended are resolved by the server:
 * the sweeper re-sends them with the original PayPal-Request-Id or re-reads pending ones, and a
 * webhook for a lost response adopts the unresolved refund instead of counting it twice.
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

const refund = (paymentId: string, body: Record<string, unknown>, key?: string) =>
  owner.post(`/payments/${paymentId}/refund`, { reason: "Test refund", ...body }, key);
const payment = async (id: string) => (await owner.get(`/payments/${id}`)).body;
const rows = (paymentId: string) => h.ctx.db.select().from(refunds).where(eq(refunds.paymentAttemptId, paymentId));
/**
 * refunds.created_at comes from the database clock, not the API's injected clock (apps
 * follow-up), and the sweeper compares it with the injected clock: put a payment's refunds on the
 * harness clock so the sweep cut-off does not depend on wall time.
 */
const onHarnessClock = (paymentId: string) =>
  h.ctx.db.update(refunds).set({ createdAt: h.clock.now }).where(eq(refunds.paymentAttemptId, paymentId));
const later = async (minutes: number) => {
  h.clock.now = new Date(h.clock.now.getTime() + minutes * 60_000);
};
const webhook = (event: unknown) =>
  request(h.app)
    .post("/api/v1/webhooks/paypal")
    .set(h.paypal.webhookHeaders())
    .set("content-type", "application/json")
    .send(JSON.stringify(event));

describe("refund reconciliation", () => {
  it("resolves a refund whose response was lost even if the client never retries", async () => {
    const o = await paidOrder(h, owner, "CLN-GLOVES");
    h.paypal.dropNextRefundResponse = true;
    const first = await refund(o.paymentId, { amount_minor: 400 });
    expect(first.status).toBe(502);
    expect(first.body.error.code).toBe("PAYPAL_REFUND_UNCONFIRMED");
    expect((await rows(o.paymentId)).map((r) => r.status)).toEqual(["UNKNOWN"]);
    await onHarnessClock(o.paymentId);
    const paidOut = h.paypal.refundCount;

    // A new refund is blocked until the unknown one is resolved...
    expect((await refund(o.paymentId, { amount_minor: 100 })).body.error.code).toBe("REFUND_IN_PROGRESS");
    // ...which the sweeper does by re-sending with the same request id: PayPal returns the original.
    await later(5);
    const report = await sweep(h.ctx);
    expect(report.refundsReconciled).toBeGreaterThanOrEqual(1);
    expect(h.paypal.refundCount).toBe(paidOut);
    expect((await rows(o.paymentId)).map((r) => r.status)).toEqual(["COMPLETED"]);
    expect(await payment(o.paymentId)).toMatchObject({ status: "PARTIALLY_REFUNDED", refunded_amount_minor: 400 });

    // Now another refund can start.
    expect((await refund(o.paymentId, { amount_minor: 100 })).status).toBe(200);
    await receiveAll(owner, o.po);
  });

  it("settles a PENDING refund once PayPal completes it", async () => {
    const o = await paidOrder(h, owner, "CLN-TOWELS");
    h.paypal.refundStatus = "PENDING";
    const res = await refund(o.paymentId, { amount_minor: 300 });
    expect(res.status).toBe(200);
    expect(res.body.payment.refunded_amount_minor).toBe(0);
    const [pending] = await rows(o.paymentId);
    expect(pending!.status).toBe("PENDING");
    await onHarnessClock(o.paymentId);

    await later(5);
    await sweep(h.ctx);
    expect((await rows(o.paymentId))[0]!.status).toBe("PENDING");

    h.paypal.completeRefund(pending!.paypalRefundId!);
    await later(5);
    await sweep(h.ctx);
    expect((await rows(o.paymentId))[0]!.status).toBe("COMPLETED");
    expect((await payment(o.paymentId)).refunded_amount_minor).toBe(300);
    await receiveAll(owner, o.po);
  });

  it("adopts the unresolved refund when PayPal's webhook reports it first, counting it once", async () => {
    const o = await paidOrder(h, owner, "PKG-NAPKINS");
    h.paypal.dropNextRefundResponse = true;
    const key = `adopt-${randomUUID()}`;
    expect((await refund(o.paymentId, { amount_minor: 250 }, key)).status).toBe(502);
    const paypalRefund = [...h.paypal.refunds.values()].at(-1)!;
    const captureId = (await payment(o.paymentId)).paypal_capture_id as string;

    const event = {
      id: `WH-${randomUUID()}`,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: paypalRefund.id,
        status: "COMPLETED",
        amount: { value: "2.50", currency_code: "USD" },
        links: [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}` }],
      },
    };
    expect((await webhook(event)).status).toBe(200);
    const all = await rows(o.paymentId);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ status: "COMPLETED", paypalRefundId: paypalRefund.id });
    expect((await payment(o.paymentId)).refunded_amount_minor).toBe(250);

    // The owner's retry is answered from the settled refund, not paid or counted again.
    const retry = await refund(o.paymentId, { amount_minor: 250 }, key);
    expect(retry.status).toBe(200);
    expect(retry.body.payment.refunded_amount_minor).toBe(250);
    expect(await rows(o.paymentId)).toHaveLength(1);
    await receiveAll(owner, o.po);
  });

  it("refuses to retry a declined refund under the same key", async () => {
    const o = await paidOrder(h, owner, "ING-CANOLA");
    h.paypal.rejectNextRefund = { status: 422, issue: "REFUND_NOT_ALLOWED" };
    const key = `declined-${randomUUID()}`;
    expect((await refund(o.paymentId, { amount_minor: 100 }, key)).body.error.code).toBe("REFUND_DECLINED");
    const again = await refund(o.paymentId, { amount_minor: 100 }, `declined-again-${randomUUID()}`);
    expect(again.status).toBe(200);
    // The idempotency layer replays only successes, so the same key reaches the service again.
    const retry = await refund(o.paymentId, { amount_minor: 100 }, key);
    expect(retry.status).toBe(409);
    expect(retry.body.error.code).toBe("REFUND_CLOSED");
    await receiveAll(owner, o.po);
  });

  it("never applies a refund reported in a different currency", async () => {
    const o = await paidOrder(h, owner, "PKG-TAKEOUT-32");
    const captureId = (await payment(o.paymentId)).paypal_capture_id as string;
    const res = await webhook({
      id: `WH-${randomUUID()}`,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: `REF-${randomUUID()}`,
        status: "COMPLETED",
        amount: { value: "5.00", currency_code: "EUR" },
        links: [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}` }],
      },
    });
    expect(res.status).toBe(200);
    expect((await payment(o.paymentId)).refunded_amount_minor).toBe(0);
    const findings = await h.ctx.db.select().from(securityFindings).where(eq(securityFindings.relatedPurchaseOrderId, o.po.id));
    expect(findings.some((f) => f.title.includes("different currency"))).toBe(true);
    await receiveAll(owner, o.po);
  });
});

describe("certificate expiry", () => {
  it("never releases the reservation of a payment whose capture starts while the sweeper checks PayPal", async () => {
    const o = await approvedOrder(owner, "CLN-GLOVES");
    await later(120);
    // The owner authorises the capture just after the sweeper has read the PayPal order.
    const realGetOrder = h.ctx.paypal.getOrder.bind(h.ctx.paypal);
    h.ctx.paypal.getOrder = async (id: string) => {
      const order = await realGetOrder(id);
      h.ctx.paypal.getOrder = realGetOrder;
      await h.ctx.db
        .update(paymentAttempts)
        .set({ status: "CAPTURE_PENDING", updatedAt: h.clock.now })
        .where(eq(paymentAttempts.id, o.paymentId));
      return order;
    };
    try {
      await sweep(h.ctx);
    } finally {
      h.ctx.paypal.getOrder = realGetOrder;
    }
    const [reservation] = await h.ctx.db.select().from(budgetReservations).where(eq(budgetReservations.intentId, o.intentId));
    expect(reservation!.status).toBe("ACTIVE");
    expect((await payment(o.paymentId)).status).toBe("CAPTURE_PENDING");
  });
});
