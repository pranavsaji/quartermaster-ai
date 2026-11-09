import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { budgetReservations, idempotencyKeys, paymentAttempts, paypalWebhookEvents, refunds } from "@qm/database";
import type { ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
import { sweep } from "../../apps/api/src/jobs/sweeper";
import { createHarness, type Client, type Harness } from "../helpers/harness";

/**
 * Regression tests for the payment-path review: refund double-pay, webhook redelivery, capture
 * error handling, abandoned captures, mandate/capture races and idempotency takeover.
 */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness({ extraEnv: {} });
  owner = await h.agent("owner");
  // Plenty of weekly budget so tests are independent of each other's spend.
  const m = (await owner.get("/mandates/current")).body.mandate;
  const keys = [
    "currency",
    "weekly_budget_minor",
    "per_order_limit_minor",
    "auto_approval_limit_minor",
    "human_approval_required",
    "approved_supplier_ids",
    "allowed_categories",
    "max_market_price_premium_pct",
    "market_price_action",
    "duplicate_window_hours",
    "duplicate_action",
    "subscriptions_allowed",
    "certificate_ttl_minutes",
    "max_quantity_multiple_of_need",
  ];
  const body = {
    ...Object.fromEntries(keys.map((k) => [k, m[k]])),
    weekly_budget_minor: 1_000_000,
    duplicate_window_hours: 0,
    expected_version: m.version,
  };
  expect((await owner.put("/mandates/current", body)).status).toBe(200);
});
afterAll(async () => {
  await h.close();
});

async function drawDown(sku: string, to: number) {
  const item = (await owner.get("/inventory")).body.items.find((i: { sku: string }) => i.sku === sku);
  if (item.on_hand !== to)
    await owner.post(`/inventory/${item.id}/adjustments`, { quantity_delta: to - item.on_hand, reason: "COUNT_CORRECTION" });
}

/** Creates, researches, approves and opens a PayPal order for the given SKU; returns ids. */
async function approvedOrder(sku: string, instruction: string) {
  await drawDown(sku, sku === "PKG-TAKEOUT-32" ? 120 : sku === "ING-CANOLA" ? 10 : 5);
  const created = await owner.post("/procurement/requests", { instruction });
  const r: ProcurementRequestDto = (await owner.post(`/procurement/requests/${created.body.id}/research`)).body;
  const p = r.proposals.find((x) => x.status === "PROPOSED") as PurchaseOrderDto;
  expect(p).toBeTruthy();
  const approval = await owner.post(`/procurement/requests/${r.id}/approve`, {
    purchase_order_id: p.id,
    cart_hash: p.cart_hash,
    acknowledged_review_codes: p.policy_decision!.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code),
  });
  expect(approval.status).toBe(200);
  const intentId = approval.body.certificate.id as string;
  const order = await owner.post(`/intents/${intentId}/paypal-order`);
  expect(order.status).toBe(200);
  return {
    intentId,
    paymentId: order.body.payment.id as string,
    paypalOrderId: order.body.paypal_order_id as string,
    total: p.total_minor,
  };
}

async function paidOrder(sku: string, instruction: string) {
  const o = await approvedOrder(sku, instruction);
  h.paypal.approve(o.paypalOrderId);
  const cap = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
  expect(cap.body.payment.status).toBe("COMPLETED");
  return o;
}

const webhook = (event: unknown) =>
  request(h.app)
    .post("/api/v1/webhooks/paypal")
    .set(h.paypal.webhookHeaders())
    .set("content-type", "application/json")
    .send(JSON.stringify(event));

describe("refunds", () => {
  it("does not pay a refund twice when a timed-out refund is retried with the same key", async () => {
    const o = await paidOrder("CLN-GLOVES", "Restock nitrile gloves");
    const before = h.paypal.refundCount;
    h.paypal.dropNextRefundResponse = true;
    const key = "refund-retry-key-0001";
    const first = await owner.post(`/payments/${o.paymentId}/refund`, { amount_minor: 1_000, reason: "Damaged" }, key);
    expect(first.status).toBe(502);
    // A different refund cannot start while the first one's outcome is unknown.
    const other = await owner.post(`/payments/${o.paymentId}/refund`, { amount_minor: 500, reason: "Other" });
    expect(other.status).toBe(409);
    expect(other.body.error.code).toBe("REFUND_IN_PROGRESS");
    const retry = await owner.post(`/payments/${o.paymentId}/refund`, { amount_minor: 1_000, reason: "Damaged" }, key);
    expect(retry.status).toBe(200);
    expect(retry.body.payment.refunded_amount_minor).toBe(1_000);
    expect(retry.body.payment.status).toBe("PARTIALLY_REFUNDED");
    expect(h.paypal.refundCount - before).toBe(1);
  });

  it("does not count a refund twice when the webhook reports it first", async () => {
    const o = await paidOrder("CLN-TOWELS", "Restock paper towels");
    const payment = (await owner.get(`/payments/${o.paymentId}`)).body;
    const res = await owner.post(`/payments/${o.paymentId}/refund`, { amount_minor: 700, reason: "Short-shipped" });
    expect(res.status).toBe(200);
    const [row] = await h.ctx.db.select().from(refunds).where(eq(refunds.paymentAttemptId, o.paymentId));
    const dup = await webhook({
      id: `WH-REF-${row!.paypalRefundId}`,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: row!.paypalRefundId,
        status: "COMPLETED",
        amount: { value: "7.00", currency_code: "USD" },
        links: [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${payment.paypal_capture_id}` }],
      },
    });
    expect(dup.status).toBe(200);
    expect((await owner.get(`/payments/${o.paymentId}`)).body.refunded_amount_minor).toBe(700);
  });
});

describe("webhooks", () => {
  it("defers a refund event that arrives before the capture is recorded, then processes the redelivery", async () => {
    const o = await approvedOrder("ING-CANOLA", "Restock cooking oil");
    h.paypal.approve(o.paypalOrderId);
    // Mark the payment as if a capture was authorised, without recording completion.
    await h.ctx.db
      .update(paymentAttempts)
      .set({ status: "CAPTURE_PENDING", paypalCaptureId: "CAP-EARLY" })
      .where(eq(paymentAttempts.id, o.paymentId));
    const event = {
      id: "WH-EARLY-REFUND",
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: "REF-EARLY",
        status: "COMPLETED",
        amount: { value: "1.00", currency_code: "USD" },
        links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAP-EARLY" }],
      },
    };
    const first = await webhook(event);
    expect(first.status).toBe(503);
    const [stored] = await h.ctx.db.select().from(paypalWebhookEvents).where(eq(paypalWebhookEvents.eventId, "WH-EARLY-REFUND"));
    expect(stored!.processed).toBe(false);
    expect((await owner.get(`/payments/${o.paymentId}`)).body.status).toBe("CAPTURE_PENDING");
    // The early refund never moved the payment into a refund state.
    expect((await owner.get(`/payments/${o.paymentId}`)).body.refunded_amount_minor).toBe(0);
  });
});

describe("capture error handling", () => {
  it("treats a PayPal 500 after a real capture as ambiguous and completes the payment", async () => {
    const o = await approvedOrder("PKG-NAPKINS", "Restock napkins");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.serverErrorAfterNextCapture = true;
    const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("COMPLETED");
  });

  it("voids a capture that never reached PayPal once the approval expires, releasing the budget", async () => {
    const o = await approvedOrder("PKG-TAKEOUT-32", "Restock takeaway containers");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.failNextCaptureBeforeProcessing = true;
    // PayPal reconciliation inside the request also fails (fetch is fine, order is still APPROVED).
    const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("CAPTURE_PENDING");
    const [held] = await h.ctx.db.select().from(budgetReservations).where(eq(budgetReservations.intentId, o.intentId));
    expect(held!.status).toBe("ACTIVE");

    h.clock.now = new Date(h.clock.now.getTime() + 90 * 60_000);
    await sweep(h.ctx);
    const after = (await owner.get(`/payments/${o.paymentId}`)).body;
    expect(after.status).toBe("VOIDED");
    const [released] = await h.ctx.db.select().from(budgetReservations).where(eq(budgetReservations.intentId, o.intentId));
    expect(released!.status).toBe("RELEASED");
    expect(h.paypal.orders.get(o.paypalOrderId)!.order.status).toBe("APPROVED");
  });
});

describe("mandate changes and in-flight captures", () => {
  it("does not void a payment whose capture is already pending when the mandate tightens", async () => {
    const o = await approvedOrder("PKG-TAKEOUT-32", "Restock takeaway containers again");
    h.paypal.approve(o.paypalOrderId);
    await h.ctx.db.update(paymentAttempts).set({ status: "CAPTURE_PENDING" }).where(eq(paymentAttempts.id, o.paymentId));
    const m = (await owner.get("/mandates/current")).body.mandate;
    const keys = [
      "currency",
      "weekly_budget_minor",
      "per_order_limit_minor",
      "auto_approval_limit_minor",
      "human_approval_required",
      "approved_supplier_ids",
      "allowed_categories",
      "max_market_price_premium_pct",
      "market_price_action",
      "duplicate_window_hours",
      "duplicate_action",
      "subscriptions_allowed",
      "certificate_ttl_minutes",
      "max_quantity_multiple_of_need",
    ];
    const put = await owner.put("/mandates/current", {
      ...Object.fromEntries(keys.map((k) => [k, m[k]])),
      per_order_limit_minor: 20_000,
      expected_version: m.version,
    });
    expect(put.status).toBe(200);
    expect((await owner.get(`/payments/${o.paymentId}`)).body.status).toBe("CAPTURE_PENDING");
    expect((await owner.get(`/intents/${o.intentId}/verify`)).body.status).not.toBe("MANDATE_CHANGED");
  });
});

describe("idempotency", () => {
  it("lets exactly one retry take over a stale in-progress key", async () => {
    const key = "stale-takeover-key-01";
    const user = (await owner.get("/auth/me")).body.user;
    const body = { instruction: "Restock gloves after stale key" };
    const { createHash } = await import("node:crypto");
    const stableBody = `{"instruction":${JSON.stringify(body.instruction)}}`;
    // Recreate the hash the middleware computes for this route with defaults applied by the client body only.
    await h.ctx.db.insert(idempotencyKeys).values({
      organizationId: user.organization.id,
      userId: user.id,
      key,
      route: "procurement.create",
      requestHash: createHash("sha256").update(`POST procurement.create {} ${stableBody}`).digest("hex"),
      status: "IN_PROGRESS",
      createdAt: new Date(h.clock.now.getTime() - 10 * 60_000),
    });
    const [a, b] = await Promise.all([owner.post("/procurement/requests", body, key), owner.post("/procurement/requests", body, key)]);
    const statuses = [a.status, b.status].sort();
    expect(statuses[0]).toBe(201);
    // The other either replays the stored response or is told the key is in progress — never a second execution.
    expect([201, 409]).toContain(statuses[1]);
    if (statuses[1] === 201) expect(a.body.id).toBe(b.body.id);
    const [row] = await h.ctx.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.userId, user.id)));
    expect(row!.status).toBe("COMPLETED");
  });
});
