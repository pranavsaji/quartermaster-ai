import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { auditEvents, paypalWebhookEvents, refunds, securityFindings } from "@qm/database";
import { PayPalNotConfiguredError } from "@qm/payments";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedOrder, paidOrder, receiveAll, relaxMandate } from "../helpers/flows";

/**
 * Owner refunds and PayPal webhook handling beyond the paths covered by the payment suites.
 * Paid orders are received at the end of a test when a later test buys the same SKU.
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
  h.paypal.reset();
});
afterAll(async () => {
  await h.close();
});

const refund = (paymentId: string, body: Record<string, unknown>, key?: string) =>
  owner.post(`/payments/${paymentId}/refund`, { reason: "Test refund", ...body }, key);
const payment = async (id: string) => (await owner.get(`/payments/${id}`)).body;

const webhook = (event: unknown) =>
  request(h.app)
    .post("/api/v1/webhooks/paypal")
    .set(h.paypal.webhookHeaders())
    .set("content-type", "application/json")
    .send(typeof event === "string" ? event : JSON.stringify(event));
const captureLink = (captureId: string) => [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}` }];
const storedEvent = async (id: string) => (await h.ctx.db.select().from(paypalWebhookEvents).where(eq(paypalWebhookEvents.eventId, id)))[0];

describe("refunds", () => {
  it("refunds the remainder by default, then refuses further refunds", async () => {
    const o = await paidOrder(h, owner, "CLN-GLOVES");
    const partial = await refund(o.paymentId, { amount_minor: 500 });
    expect(partial.body.payment).toMatchObject({ status: "PARTIALLY_REFUNDED", refunded_amount_minor: 500 });

    const tooMuch = await refund(o.paymentId, { amount_minor: o.total });
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.error.code).toBe("REFUND_AMOUNT_INVALID");

    const rest = await refund(o.paymentId, {});
    expect(rest.status).toBe(200);
    expect(rest.body.payment).toMatchObject({ status: "REFUNDED", refunded_amount_minor: o.total });

    const more = await refund(o.paymentId, { amount_minor: 1 });
    expect(more.status).toBe(409);
    expect(more.body.error.code).toBe("NOT_REFUNDABLE");
    // Goods still arrive; receiving them frees the SKU for later tests in this file.
    await receiveAll(owner, o.po);
  });

  it("answers a retried refund from the record instead of refunding again", async () => {
    const o = await paidOrder(h, owner, "CLN-TOWELS");
    const key = `refund-${randomUUID()}`;
    const first = await refund(o.paymentId, { amount_minor: 300 }, key);
    expect(first.status).toBe(200);
    const count = h.paypal.refundCount;
    const again = await refund(o.paymentId, { amount_minor: 300 }, key);
    expect(again.status).toBe(200);
    expect(again.body.payment.refunded_amount_minor).toBe(300);
    expect(h.paypal.refundCount).toBe(count);
    await receiveAll(owner, o.po);
  });

  it("records a refund PayPal rejects as failed, so a new refund may start", async () => {
    const o = await paidOrder(h, owner, "ING-CANOLA");
    h.paypal.rejectNextRefund = { status: 422, issue: "REFUND_NOT_ALLOWED" };
    const rejected = await refund(o.paymentId, { amount_minor: 200 });
    expect(rejected.status).toBe(422);
    expect(rejected.body.error).toMatchObject({ code: "REFUND_DECLINED", details: { paypal_issue: "REFUND_NOT_ALLOWED" } });
    const rows = await h.ctx.db.select().from(refunds).where(eq(refunds.paymentAttemptId, o.paymentId));
    expect(rows.map((r) => r.status)).toEqual(["FAILED"]);
    expect((await payment(o.paymentId)).refunded_amount_minor).toBe(0);

    const next = await refund(o.paymentId, { amount_minor: 200 });
    expect(next.status).toBe(200);
    expect(next.body.payment.refunded_amount_minor).toBe(200);
  });

  it("refuses refunds of unpaid payments and from non-owners", async () => {
    const o = await approvedOrder(owner, "PKG-NAPKINS");
    const unpaid = await refund(o.paymentId, { amount_minor: 100 });
    expect(unpaid.status).toBe(409);
    expect(unpaid.body.error.code).toBe("NOT_REFUNDABLE");
    const manager = await h.agent("manager");
    expect((await manager.post(`/payments/${o.paymentId}/refund`, { reason: "x" })).status).toBe(403);
    expect((await refund(o.paymentId, { amount_minor: 0 })).status).toBe(400);
  });
});

describe("webhook processing", () => {
  it("reconciles an order event for a known payment once, and reports redeliveries as duplicates", async () => {
    const o = await approvedOrder(owner, "PKG-TAKEOUT-32");
    h.paypal.approve(o.paypalOrderId);
    const event = { id: `WH-${randomUUID()}`, event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: o.paypalOrderId } };
    const res = await webhook(event);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true, outcome: "PROCESSED" });
    expect((await payment(o.paymentId)).status).toBe("PAYER_APPROVED");
    expect(await storedEvent(event.id)).toMatchObject({ processed: true, result: "reconciled to PAYER_APPROVED" });
    const audit = await h.ctx.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, o.paymentId), eq(auditEvents.action, "paypal.webhook_processed")));
    expect(audit).toHaveLength(1);

    const again = await webhook(event);
    expect(again.body.outcome).toBe("DUPLICATE");

    // A capture event names the order in its supplementary data.
    h.paypal.captureDirectly(o.paypalOrderId);
    const captured = await webhook({
      id: `WH-${randomUUID()}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: `CAP-${randomUUID()}`, supplementary_data: { related_ids: { order_id: o.paypalOrderId } } },
    });
    expect(captured.body.outcome).toBe("PROCESSED");
    expect((await payment(o.paymentId)).status).toBe("COMPLETED");
  });

  it("ignores events it cannot attribute and records why", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: `ORDER-${randomUUID()}` } }, "no matching payment"],
      [{ event_type: "BILLING.SUBSCRIPTION.CREATED", resource: { id: "I-1" } }, "ignored"],
      [{ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: `REF-${randomUUID()}`, links: [] } }, "no matching payment"],
    ];
    for (const [partial, result] of cases) {
      const event = { id: `WH-${randomUUID()}`, ...partial };
      const res = await webhook(event);
      expect(res.body.outcome, JSON.stringify(partial)).toBe("IGNORED");
      expect((await storedEvent(event.id))!.result).toBe(result);
    }
  });

  it("records a pending refund without counting it, and ignores refund events without an amount", async () => {
    const o = await paidOrder(h, owner, "CLN-GLOVES");
    const captureId = (await payment(o.paymentId)).paypal_capture_id as string;
    const noAmount = {
      id: `WH-${randomUUID()}`,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: { id: `REF-${randomUUID()}`, links: captureLink(captureId) },
    };
    expect((await webhook(noAmount)).body.outcome).toBe("IGNORED");
    expect((await storedEvent(noAmount.id))!.result).toBe("refund event without amount");

    const pending = {
      id: `WH-${randomUUID()}`,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: `REF-${randomUUID()}`,
        status: "PENDING",
        amount: { value: "2.50", currency_code: "USD" },
        links: captureLink(captureId),
      },
    };
    expect((await webhook(pending)).body.outcome).toBe("PROCESSED");
    expect((await storedEvent(pending.id))!.result).toBe("refund recorded");
    expect((await payment(o.paymentId)).refunded_amount_minor).toBe(0);

    // PayPal later reports the same refund completed: counted exactly once.
    const completed = { ...pending, id: `WH-${randomUUID()}`, resource: { ...pending.resource, status: "COMPLETED" } };
    expect((await webhook(completed)).body.outcome).toBe("PROCESSED");
    expect((await storedEvent(completed.id))!.result).toBe("refund applied");
    const again = { ...completed, id: `WH-${randomUUID()}` };
    await webhook(again);
    expect((await storedEvent(again.id))!.result).toBe("refund duplicate");
    expect((await payment(o.paymentId)).refunded_amount_minor).toBe(250);
  });

  it("leaves an event unprocessed for redelivery when PayPal cannot be read", async () => {
    const o = await approvedOrder(owner, "CLN-TOWELS");
    vi.spyOn(h.ctx.paypal, "getOrder").mockRejectedValue(new Error("connect ETIMEDOUT"));
    const event = { id: `WH-${randomUUID()}`, event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: o.paypalOrderId } };
    const res = await webhook(event);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("WEBHOOK_PROCESSING_FAILED");
    const stored = await storedEvent(event.id);
    expect(stored!.processed).toBe(false);
    expect(stored!.result).toMatch(/^failed: /);

    vi.restoreAllMocks();
    h.paypal.approve(o.paypalOrderId);
    expect((await webhook(event)).body.outcome).toBe("PROCESSED");
  });
});

describe("webhook verification", () => {
  it("rejects bodies that are not JSON", async () => {
    const res = await webhook("{not json");
    expect(res.status).toBe(400);
  });

  it("answers 503 so PayPal retries when verification is unavailable or webhooks are not configured", async () => {
    const event = { id: `WH-${randomUUID()}`, event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "O-1" } };
    vi.spyOn(h.ctx.paypal, "verifyWebhook").mockRejectedValueOnce(new Error("ECONNRESET"));
    const unreachable = await webhook(event);
    expect(unreachable.status).toBe(503);
    expect(unreachable.body.error.code).toBe("WEBHOOK_VERIFICATION_UNAVAILABLE");

    vi.spyOn(h.ctx.paypal, "verifyWebhook").mockRejectedValueOnce(new PayPalNotConfiguredError());
    expect((await webhook(event)).body.error.code).toBe("WEBHOOKS_NOT_CONFIGURED");

    vi.restoreAllMocks();
    vi.spyOn(h.ctx.paypal, "webhookConfigured", "get").mockReturnValue(false);
    const off = await webhook(event);
    expect(off.status).toBe(503);
    expect(off.body.error.code).toBe("WEBHOOKS_NOT_CONFIGURED");
    // Nothing was stored for any of these attempts.
    expect(await storedEvent(event.id)).toBeUndefined();
  });

  it("records one rate-limited finding for forged events about a real payment", async () => {
    const o = await approvedOrder(owner, "PKG-NAPKINS");
    h.paypal.webhookVerification = "FAILURE";
    const forged = () => webhook({ id: `WH-${randomUUID()}`, event_type: "CHECKOUT.ORDER.COMPLETED", resource: { id: o.paypalOrderId } });
    expect((await forged()).status).toBe(400);
    expect((await forged()).status).toBe(400);
    const findings = await h.ctx.db
      .select()
      .from(securityFindings)
      .where(and(eq(securityFindings.relatedPurchaseOrderId, o.proposal.id), eq(securityFindings.type, "WEBHOOK_SIGNATURE_INVALID")));
    expect(findings).toHaveLength(1);
    expect((await payment(o.paymentId)).status).toBe("ORDER_CREATED");
  });
});
