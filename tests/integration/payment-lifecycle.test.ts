import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { agentRuns, budgetReservations, paymentAttempts, purchaseRequests, refunds, securityFindings } from "@qm/database";
import type { ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
import { sweep } from "../../apps/api/src/jobs/sweeper";
import { createHarness, type Client, type Harness } from "../helpers/harness";

/**
 * Payment-path behaviour added after the backend quality audit: local failures after a real
 * capture, provider order mismatches, pending refunds, reversals, late captures and recovery of
 * interrupted research.
 */
let h: Harness;
let owner: Client;

const MANDATE_KEYS = [
  "currency", "weekly_budget_minor", "per_order_limit_minor", "auto_approval_limit_minor", "human_approval_required",
  "approved_supplier_ids", "allowed_categories", "max_market_price_premium_pct", "market_price_action", "duplicate_window_hours",
  "duplicate_action", "subscriptions_allowed", "certificate_ttl_minutes", "max_quantity_multiple_of_need",
];

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  const m = (await owner.get("/mandates/current")).body.mandate;
  const body = { ...Object.fromEntries(MANDATE_KEYS.map((k) => [k, m[k]])), weekly_budget_minor: 1_000_000, duplicate_window_hours: 0, expected_version: m.version };
  expect((await owner.put("/mandates/current", body)).status).toBe(200);
});
afterEach(() => h.paypal.reset());
afterAll(async () => {
  await h.close();
});

async function drawDown(sku: string, to: number) {
  const item = (await owner.get("/inventory")).body.items.find((i: { sku: string }) => i.sku === sku);
  if (item.on_hand !== to) await owner.post(`/inventory/${item.id}/adjustments`, { quantity_delta: to - item.on_hand, reason: "COUNT_CORRECTION" });
}

async function approvedIntent(sku: string, instruction: string) {
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
  return { requestId: r.id, intentId: approval.body.certificate.id as string, total: p.total_minor };
}

async function approvedOrder(sku: string, instruction: string) {
  const a = await approvedIntent(sku, instruction);
  const order = await owner.post(`/intents/${a.intentId}/paypal-order`);
  expect(order.status).toBe(200);
  return { ...a, paymentId: order.body.payment.id as string, paypalOrderId: order.body.paypal_order_id as string };
}

async function paidOrder(sku: string, instruction: string) {
  const o = await approvedOrder(sku, instruction);
  h.paypal.approve(o.paypalOrderId);
  const cap = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
  expect(cap.body.payment.status).toBe("COMPLETED");
  return o;
}

const webhook = (event: unknown) =>
  request(h.app).post("/api/v1/webhooks/paypal").set(h.paypal.webhookHeaders()).set("content-type", "application/json").send(JSON.stringify(event));

const captureLink = (captureId: string) => [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}` }];

describe("capture", () => {
  it("never reports a real capture as failed when recording it locally fails", async () => {
    const o = await approvedOrder("CLN-GLOVES", "Restock gloves for the capture test");
    h.paypal.approve(o.paypalOrderId);
    // Fail the first database transaction after PayPal has captured (simulated deadlock).
    const realCapture = h.ctx.paypal.captureOrder.bind(h.ctx.paypal);
    const realTransaction = h.ctx.db.transaction.bind(h.ctx.db);
    h.ctx.paypal.captureOrder = async (...args) => {
      const res = await realCapture(...args);
      h.ctx.db.transaction = (async () => {
        h.ctx.db.transaction = realTransaction;
        throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
      });
      return res;
    };
    try {
      const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
      expect(res.status).toBe(200);
      expect(res.body.payment.status).toBe("CAPTURE_PENDING");
      expect(res.body.payment.failure_message ?? "").not.toMatch(/deadlock/);
    } finally {
      h.ctx.paypal.captureOrder = realCapture;
      h.ctx.db.transaction = realTransaction;
    }
    expect(h.paypal.captureCount).toBeGreaterThan(0);
    // The sweeper finds the captured order and records it.
    await h.ctx.db.update(paymentAttempts).set({ updatedAt: new Date(h.clock.now.getTime() - 5 * 60_000) }).where(eq(paymentAttempts.id, o.paymentId));
    await sweep(h.ctx);
    expect((await owner.get(`/payments/${o.paymentId}`)).body.status).toBe("COMPLETED");
  });

  it("returns the buyer to checkout after a definitive decline without exposing PayPal's raw message", async () => {
    const o = await approvedOrder("CLN-TOWELS", "Restock towels for the decline test");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.declineNextCapture = true;
    const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INSTRUMENT_DECLINED");
    const p = (await owner.get(`/payments/${o.paymentId}`)).body;
    expect(p.status).toBe("ORDER_CREATED");
    expect(p.failure_code).toBe("INSTRUMENT_DECLINED");
    expect(p.failure_message).toBe("PayPal declined the funding source.");
  });
});

describe("order creation", () => {
  it("voids the attempt and raises a critical finding when PayPal's order does not match the intent", async () => {
    const a = await approvedIntent("PKG-NAPKINS", "Restock napkins for the mismatch test");
    h.paypal.tamperNextCreateAmount = "0.01";
    const res = await owner.post(`/intents/${a.intentId}/paypal-order`);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("PAYPAL_ORDER_MISMATCH");
    const [p] = await h.ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.intentId, a.intentId));
    expect(p!.status).toBe("VOIDED");
    expect(p!.failureCode).toBe("PAYPAL_ORDER_MISMATCH");
    const findings = await h.ctx.db.select().from(securityFindings).where(and(eq(securityFindings.sourceId, p!.id), eq(securityFindings.type, "PAYMENT_AMOUNT_MISMATCH")));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("CRITICAL");
    // A retry cannot resurrect it.
    expect((await owner.post(`/intents/${a.intentId}/paypal-order`)).status).toBeGreaterThanOrEqual(400);
  });
});

describe("refunds", () => {
  it("does not count a PENDING refund until PayPal reports it completed, and blocks other refunds meanwhile", async () => {
    const o = await paidOrder("PKG-TAKEOUT-32", "Restock takeaway containers for the pending refund test");
    h.paypal.refundStatus = "PENDING";
    const res = await owner.post(`/payments/${o.paymentId}/refund`, { amount_minor: 900, reason: "Damaged" });
    expect(res.status).toBe(200);
    expect(res.body.payment.refunded_amount_minor).toBe(0);
    expect(res.body.payment.status).toBe("COMPLETED");
    const other = await owner.post(`/payments/${o.paymentId}/refund`, { amount_minor: 100, reason: "Other" });
    expect(other.status).toBe(409);

    const [row] = await h.ctx.db.select().from(refunds).where(eq(refunds.paymentAttemptId, o.paymentId));
    expect(row!.status).toBe("PENDING");
    const payment = (await owner.get(`/payments/${o.paymentId}`)).body;
    const event = {
      id: `WH-PENDING-${row!.paypalRefundId}`,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: { id: row!.paypalRefundId, status: "COMPLETED", amount: { value: "9.00", currency_code: "USD" }, links: captureLink(payment.paypal_capture_id) },
    };
    expect((await webhook(event)).status).toBe(200);
    expect((await webhook({ ...event, id: `${event.id}-redelivery` })).status).toBe(200);
    const after = (await owner.get(`/payments/${o.paymentId}`)).body;
    expect(after.refunded_amount_minor).toBe(900);
    expect(after.status).toBe("PARTIALLY_REFUNDED");
  });

  it("records a PayPal reversal (chargeback) once, adjusts the payment and raises a finding", async () => {
    const o = await paidOrder("CLN-TOWELS", "Restock towels for the reversal test");
    const payment = (await owner.get(`/payments/${o.paymentId}`)).body;
    const event = {
      id: "WH-REVERSAL-1",
      event_type: "PAYMENT.CAPTURE.REVERSED",
      resource: { id: "REV-1", status: "COMPLETED", amount: { value: "5.00", currency_code: "USD" }, links: captureLink(payment.paypal_capture_id) },
    };
    expect((await webhook(event)).status).toBe(200);
    expect((await webhook({ ...event, id: "WH-REVERSAL-1b" })).status).toBe(200);
    const after = (await owner.get(`/payments/${o.paymentId}`)).body;
    expect(after.refunded_amount_minor).toBe(500);
    expect(after.status).toBe("PARTIALLY_REFUNDED");
    const findings = await h.ctx.db.select().from(securityFindings).where(and(eq(securityFindings.sourceId, o.paymentId), eq(securityFindings.type, "PAYMENT_REVERSED")));
    expect(findings).toHaveLength(1);
  });
});

describe("webhooks", () => {
  it("rejects structurally invalid events before verifying them", async () => {
    const before = h.paypal.verificationRequests.length;
    for (const body of [{ id: "x", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: null }, { id: 1, event_type: "X", resource: {} }, []]) {
      expect((await webhook(body)).status).toBe(400);
    }
    expect(h.paypal.verificationRequests.length).toBe(before);
  });

  it("sends PayPal the exact event, configured webhook id and transmission headers for verification", async () => {
    const event = { id: "WH-VERIFY-SHAPE", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "UNKNOWN-ORDER" } };
    const headers = h.paypal.webhookHeaders();
    const res = await request(h.app).post("/api/v1/webhooks/paypal").set(headers).set("content-type", "application/json").send(JSON.stringify(event));
    expect(res.status).toBe(200);
    const sent = h.paypal.verificationRequests.at(-1)!;
    expect(sent).toMatchObject({
      webhook_id: "WH-FAKE",
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"],
      auth_algo: headers["paypal-auth-algo"],
      webhook_event: event,
    });
  });
});

describe("sweeper", () => {
  it("records a capture that happened at PayPal after the attempt was voided", async () => {
    const o = await approvedOrder("PKG-NAPKINS", "Restock napkins for the late capture test");
    h.paypal.approve(o.paypalOrderId);
    await h.ctx.db.update(paymentAttempts).set({ status: "VOIDED", failureCode: "MANDATE_CHANGED" }).where(eq(paymentAttempts.id, o.paymentId));
    h.paypal.captureDirectly(o.paypalOrderId);
    await sweep(h.ctx);
    const p = (await owner.get(`/payments/${o.paymentId}`)).body;
    expect(p.status).toBe("COMPLETED");
    expect(p.captured_amount_minor).toBe(o.total);
  });

  it("fails research abandoned by a crashed process so the request can be researched again", async () => {
    const created = await owner.post("/procurement/requests", { instruction: "Restock gloves after a crash" });
    const id = created.body.id as string;
    const started = new Date(h.clock.now.getTime() - 60 * 60_000);
    await h.ctx.db.update(purchaseRequests).set({ status: "RESEARCHING", researchStartedAt: started }).where(eq(purchaseRequests.id, id));
    await h.ctx.db.insert(agentRuns).values({ organizationId: created.body.organization_id ?? (await owner.get("/auth/me")).body.user.organization.id, requestId: id, kind: "RESEARCH", status: "RUNNING", aiMode: "DETERMINISTIC_FALLBACK" });
    const report = await sweep(h.ctx);
    expect(report.researchRecovered).toBeGreaterThanOrEqual(1);
    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    expect(row!.status).toBe("FAILED");
    const runs = await h.ctx.db.select().from(agentRuns).where(and(eq(agentRuns.requestId, id), eq(agentRuns.status, "RUNNING")));
    expect(runs).toHaveLength(0);
    expect((await owner.post(`/procurement/requests/${id}/research`)).status).toBe(200);
  });

  it("leaves research that is still within its deadline alone", async () => {
    const created = await owner.post("/procurement/requests", { instruction: "Restock towels while research runs" });
    const id = created.body.id as string;
    await h.ctx.db.update(purchaseRequests).set({ status: "RESEARCHING", researchStartedAt: h.clock.now }).where(eq(purchaseRequests.id, id));
    await sweep(h.ctx);
    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    expect(row!.status).toBe("RESEARCHING");
    // Approval and re-research both refuse while research runs.
    expect((await owner.post(`/procurement/requests/${id}/research`)).status).toBe(409);
  });
});

describe("budget release on decline", () => {
  it("keeps the reservation while the buyer retries after a decline", async () => {
    const o = await approvedOrder("ING-CANOLA", "Restock oil for the reservation test");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.declineNextCapture = true;
    expect((await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId })).status).toBe(422);
    const [held] = await h.ctx.db.select().from(budgetReservations).where(eq(budgetReservations.intentId, o.intentId));
    expect(held!.status).toBe("ACTIVE");
    const retry = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(retry.body.payment.status).toBe("COMPLETED");
  });
});
