import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import request from "supertest";
import { auditEvents, purchaseOrderItems } from "@qm/database";
import type { ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
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

async function newResearchedRequest(instruction = DEMO_INSTRUCTION): Promise<ProcurementRequestDto> {
  const created = await owner.post("/procurement/requests", { instruction });
  expect(created.status).toBe(201);
  const researched = await owner.post(`/procurement/requests/${created.body.id}/research`);
  expect(researched.status).toBe(200);
  return researched.body as ProcurementRequestDto;
}

/** Draws an item's stock down so the forecast requires a reorder, independent of test order. */
async function drawDown(sku: string, to: number) {
  const item = (await owner.get("/inventory")).body.items.find((i: { sku: string }) => i.sku === sku);
  const delta = to - item.on_hand;
  if (delta !== 0) expect((await owner.post(`/inventory/${item.id}/adjustments`, { quantity_delta: delta, reason: "COUNT_CORRECTION" })).status).toBe(200);
}

function mandateInput(m: Record<string, unknown>) {
  const keys = [
    "currency", "weekly_budget_minor", "per_order_limit_minor", "auto_approval_limit_minor", "human_approval_required",
    "approved_supplier_ids", "allowed_categories", "max_market_price_premium_pct", "market_price_action", "duplicate_window_hours",
    "duplicate_action", "subscriptions_allowed", "certificate_ttl_minutes", "max_quantity_multiple_of_need",
  ];
  return { ...Object.fromEntries(keys.map((k) => [k, m[k]])), expected_version: m.version };
}

const proposal = (r: ProcurementRequestDto, supplierPrefix: string) => r.proposals.find((p) => p.supplier_name.startsWith(supplierPrefix) && p.status !== "SUPERSEDED")!;
const reviewCodes = (p: PurchaseOrderDto) => p.policy_decision!.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code);

async function approve(r: ProcurementRequestDto, p: PurchaseOrderDto, client = owner) {
  return client.post(`/procurement/requests/${r.id}/approve`, { purchase_order_id: p.id, cart_hash: p.cart_hash, acknowledged_review_codes: reviewCodes(p) });
}

async function pay(intentId: string) {
  const order = await owner.post(`/intents/${intentId}/paypal-order`);
  expect(order.status).toBe(200);
  h.paypal.approve(order.body.paypal_order_id);
  return { order: order.body as { payment: { id: string }; paypal_order_id: string } };
}

describe("end-to-end purchasing journey", () => {
  let req: ProcurementRequestDto;
  let intentId: string;
  let paymentId: string;
  let paypalOrderId: string;

  it("interprets, researches, blocks the adversarial supplier and proposes compliant carts", async () => {
    req = await newResearchedRequest();
    expect(req.status).toBe("READY_FOR_REVIEW");
    expect(req.intent?.demand_multiplier).toBe(1.25);
    expect(req.intent?.budget_limit_minor).toBe(30_000);

    const blocked = proposal(req, "QuickServe");
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.policy_decision!.decision).toBe("BLOCK");
    expect(blocked.policy_decision!.violations.map((v) => v.code)).toEqual(expect.arrayContaining(["UNAUTHORIZED_LINE_ITEM", "QUARANTINED_SOURCE"]));
    expect(req.security_findings.map((f) => f.type)).toEqual(expect.arrayContaining(["PROMPT_INJECTION", "UNAUTHORIZED_FEE"]));

    const harbor = proposal(req, "Harbor");
    expect(harbor.status).toBe("PROPOSED");
    expect(harbor.total_minor).toBe(17_320);
    expect(proposal(req, "Coastal").total_minor).toBe(10_500);
    // Candidates from the unapproved supplier are shown for review only.
    expect(req.candidates.find((c) => c.supplier_name === "PackRight Wholesale")?.eligible).toBe(false);
    expect(req.recommendation?.summary).toMatch(/\$278\.20/);
  });

  it("never lets the blocked cart be approved", async () => {
    const res = await approve(req, proposal(req, "QuickServe"));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PROPOSAL_NOT_APPROVABLE");
  });

  it("requires every review item to be acknowledged", async () => {
    const harbor = proposal(req, "Harbor");
    const res = await owner.post(`/procurement/requests/${req.id}/approve`, { purchase_order_id: harbor.id, cart_hash: harbor.cart_hash });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("REVIEW_ACKNOWLEDGEMENT_REQUIRED");
  });

  it("rejects approval of a cart hash the owner did not see", async () => {
    const harbor = proposal(req, "Harbor");
    const res = await owner.post(`/procurement/requests/${req.id}/approve`, { purchase_order_id: harbor.id, cart_hash: `sha256:${"0".repeat(64)}`, acknowledged_review_codes: reviewCodes(harbor) });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CART_CHANGED");
  });

  it("only owners can approve", async () => {
    const manager = await h.agent("manager");
    const res = await approve(req, proposal(req, "Harbor"), manager);
    expect(res.status).toBe(403);
  });

  it("approves the exact cart, signs a certificate and reserves budget", async () => {
    const res = await approve(req, proposal(req, "Harbor"));
    expect(res.status).toBe(200);
    expect(res.body.purchase_order.status).toBe("APPROVED");
    intentId = res.body.certificate.id;
    expect(res.body.certificate.payload.approved_amount_minor).toBe(17_320);

    const verify = await owner.get(`/intents/${intentId}/verify`);
    expect(verify.body).toMatchObject({ status: "VALID", valid: true });

    const mandate = await owner.get("/mandates/current");
    expect(mandate.body.budget.reserved_minor).toBe(17_320);
  });

  it("creates exactly one PayPal order per intent, even when retried", async () => {
    const a = await owner.post(`/intents/${intentId}/paypal-order`);
    const b = await owner.post(`/intents/${intentId}/paypal-order`);
    expect(a.status).toBe(200);
    expect(b.body.paypal_order_id).toBe(a.body.paypal_order_id);
    expect(h.paypal.orders.size).toBe(1);
    const created = h.paypal.orders.get(a.body.paypal_order_id)!;
    expect(created.body.purchase_units[0]!.amount.value).toBe("173.20");
    expect(created.body.purchase_units[0]!.custom_id).toBe(intentId);
    paymentId = a.body.payment.id;
    paypalOrderId = a.body.paypal_order_id;
  });

  it("refuses capture before the buyer approves at PayPal", async () => {
    const res = await owner.post(`/payments/${paymentId}/capture`, { paypal_order_id: paypalOrderId });
    expect(res.status).toBe(422);
    expect(res.body.error.details.failures.map((f: { code: string }) => f.code)).toContain("PROVIDER_STATUS");
  });

  it("refuses a substituted PayPal order id", async () => {
    h.paypal.approve(paypalOrderId);
    const res = await owner.post(`/payments/${paymentId}/capture`, { paypal_order_id: "FAKE9999999999999" });
    expect([404, 422, 502]).toContain(res.status);
  });

  it("captures after buyer approval and moves the order to fulfillment", async () => {
    const res = await owner.post(`/payments/${paymentId}/capture`, { paypal_order_id: paypalOrderId });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("COMPLETED");
    expect(res.body.payment.captured_amount_minor).toBe(17_320);
    expect(res.body.purchase_order.status).toBe("PAID");
    expect(res.body.purchase_order.delivery.status).toBe("SCHEDULED");
    expect(res.body.purchase_order.certificate.status).toBe("CONSUMED");

    const budget = (await owner.get("/mandates/current")).body.budget;
    expect(budget.spent_minor).toBe(17_320);
    expect(budget.reserved_minor).toBe(0);
  });

  it("treats a repeated capture as the same logical payment", async () => {
    const before = h.paypal.captureCount;
    const res = await owner.post(`/payments/${paymentId}/capture`, { paypal_order_id: paypalOrderId });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("COMPLETED");
    expect(h.paypal.captureCount).toBe(before);
  });

  it("deduplicates webhooks and never regresses a completed payment", async () => {
    const event = { id: "WH-EVT-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP", supplementary_data: { related_ids: { order_id: paypalOrderId } } } };
    const send = () => request(h.app).post("/api/v1/webhooks/paypal").set(h.paypal.webhookHeaders()).set("content-type", "application/json").send(JSON.stringify(event));
    const first = await send();
    expect(first.body.outcome).toBe("PROCESSED");
    const second = await send();
    expect(second.body.outcome).toBe("DUPLICATE");
    const late = { id: "WH-EVT-2", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: paypalOrderId } };
    await request(h.app).post("/api/v1/webhooks/paypal").set(h.paypal.webhookHeaders()).set("content-type", "application/json").send(JSON.stringify(late));
    expect((await owner.get(`/payments/${paymentId}`)).body.status).toBe("COMPLETED");
  });

  it("rejects webhooks with invalid signatures", async () => {
    h.paypal.webhookVerification = "FAILURE";
    const res = await request(h.app)
      .post("/api/v1/webhooks/paypal")
      .set(h.paypal.webhookHeaders())
      .set("content-type", "application/json")
      .send(JSON.stringify({ id: "WH-FORGED", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "X" } }));
    h.paypal.webhookVerification = "SUCCESS";
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WEBHOOK_SIGNATURE_INVALID");
  });

  it("rejects webhooks whose certificate URL is not PayPal's", async () => {
    const res = await request(h.app)
      .post("/api/v1/webhooks/paypal")
      .set({ ...h.paypal.webhookHeaders(), "paypal-cert-url": "https://evil.example.com/cert.pem" })
      .set("content-type", "application/json")
      .send(JSON.stringify({ id: "WH-EVIL", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "X" } }));
    expect(res.status).toBe(400);
  });

  it("flags a duplicate invoice without any further payment", async () => {
    const po = proposal((await owner.get(`/procurement/requests/${req.id}`)).body, "Harbor");
    const product = po.items.find((i) => i.kind === "PRODUCT")!;
    const tax = po.items.find((i) => i.kind === "TAX")!;
    const invoice = {
      supplier_id: po.supplier_id,
      purchase_order_id: po.id,
      invoice_number: "HRS-INV-5001",
      invoice_date: "2026-11-11",
      currency: "USD",
      lines: [
        { sku: product.sku, description: product.description, quantity: product.quantity, unit_price_minor: product.unit_price_minor, line_total_minor: product.line_total_minor },
        { sku: null, description: "Sales tax", quantity: 1, unit_price_minor: tax.line_total_minor, line_total_minor: tax.line_total_minor },
      ],
      total_minor: po.total_minor,
    };
    const first = await owner.post("/invoices/analyze", invoice);
    expect(first.body.status).toBe("MATCHED");
    expect(first.body.settlement_allowed).toBe(true);
    const dup = await owner.post("/invoices/analyze", { ...invoice, invoice_number: "hrs inv 5001" });
    expect(dup.body.status).toBe("DUPLICATE");
    expect(dup.body.settlement_allowed).toBe(false);
    expect(h.paypal.captureCount).toBe(1);
  });

  it("updates inventory only when goods are received", async () => {
    const before = (await owner.get("/inventory")).body.items.find((i: { sku: string }) => i.sku === "PKG-TAKEOUT-32");
    const po = proposal((await owner.get(`/procurement/requests/${req.id}`)).body, "Harbor");
    expect(before.inbound_confirmed).toBe(500);
    const line = po.items.find((i) => i.kind === "PRODUCT")!;
    const over = await owner.post(`/deliveries/${po.delivery!.id}/receive`, { lines: [{ purchase_order_item_id: line.id, quantity_received: 501 }] });
    expect(over.status).toBe(422);
    const ok = await owner.post(`/deliveries/${po.delivery!.id}/receive`, { lines: [{ purchase_order_item_id: line.id, quantity_received: 500 }] });
    expect(ok.body.delivery.status).toBe("DELIVERED");
    const after = (await owner.get("/inventory")).body.items.find((i: { sku: string }) => i.sku === "PKG-TAKEOUT-32");
    expect(after.on_hand).toBe(before.on_hand + 500);
    expect(after.inbound_confirmed).toBe(0);
  });

  it("reports measurable outcomes", async () => {
    const a = (await owner.get("/analytics/summary")).body;
    expect(a.totals.captured_spend_minor).toBe(17_320);
    expect(a.security.duplicate_captures).toBe(0);
    expect(a.security.blocked_attempts).toBeGreaterThanOrEqual(1);
    expect(a.security.prompt_injections_detected).toBeGreaterThanOrEqual(1);
    expect(a.security.duplicate_invoices_flagged).toBe(1);
  });

  it("keeps a verifiable audit chain that detects tampering", async () => {
    const ok = await owner.get("/security/audit/verify");
    expect(ok.body.valid).toBe(true);
    expect(ok.body.events_checked).toBeGreaterThan(10);
    const [victim] = await h.ctx.db.select().from(auditEvents).where(eq(auditEvents.action, "payment.captured"));
    // The database refuses to rewrite or delete audit rows.
    const cause = (p: Promise<unknown>) => p.catch((e: { cause?: unknown }) => Promise.reject(e.cause ?? e));
    await expect(cause(h.ctx.db.update(auditEvents).set({ data: {} }).where(eq(auditEvents.id, victim!.id)))).rejects.toThrow(/append-only/);
    await expect(cause(h.ctx.db.delete(auditEvents).where(eq(auditEvents.id, victim!.id)))).rejects.toThrow(/cannot be deleted/);

    // Someone with DDL rights can bypass the trigger; the hash chain still exposes the edit.
    await h.ctx.db.execute(sql`alter table audit_events disable trigger audit_events_append_only`);
    try {
      await h.ctx.db.update(auditEvents).set({ data: { ...victim!.data, captured_minor: 1 } }).where(eq(auditEvents.id, victim!.id));
      const bad = await owner.get("/security/audit/verify");
      expect(bad.body.valid).toBe(false);
      expect(bad.body.first_invalid_sequence).toBe(victim!.sequence);
      await h.ctx.db.update(auditEvents).set({ data: victim!.data }).where(eq(auditEvents.id, victim!.id));
    } finally {
      await h.ctx.db.execute(sql`alter table audit_events enable trigger audit_events_append_only`);
    }
  });
});

describe("failure handling and attacks on the payment path", () => {
  it("recovers from a lost capture response by reconciling with PayPal", async () => {
    const r = await newResearchedRequest("Restock cooking oil for a busy weekend");
    const coastal = proposal(r, "Coastal");
    const approval = await approve(r, coastal);
    expect(approval.status).toBe(200);
    const { order } = await pay(approval.body.certificate.id);
    h.paypal.dropNextCaptureResponse = true;
    const res = await owner.post(`/payments/${order.payment.id}/capture`, { paypal_order_id: order.paypal_order_id });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("COMPLETED");
  });

  it("refuses capture when PayPal reports a different amount", async () => {
    // Fresh org state: tighten nothing, just new request for gloves (not yet purchased).
    const r = await newResearchedRequest("Restock nitrile gloves");
    const p = r.proposals.find((x) => x.status === "PROPOSED")!;
    const approval = await approve(r, p);
    const { order } = await pay(approval.body.certificate.id);
    h.paypal.tamperAmount = "1.00";
    const res = await owner.post(`/payments/${order.payment.id}/capture`, { paypal_order_id: order.paypal_order_id });
    h.paypal.tamperAmount = null;
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CAPTURE_REFUSED");
    const findings = (await owner.get("/security/events?type=PAYMENT_AMOUNT_MISMATCH")).body.items;
    expect(findings.length).toBeGreaterThan(0);
  });

  it("refuses payment if the cart is altered in the database after approval", async () => {
    await drawDown("CLN-TOWELS", 5);
    const r = await newResearchedRequest("Restock paper towels");
    const p = r.proposals.find((x) => x.status === "PROPOSED")!;
    const approval = await approve(r, p);
    expect(approval.status).toBe(200);
    const [line] = await h.ctx.db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, p.id));
    await h.ctx.db.update(purchaseOrderItems).set({ description: `${line!.description} + hidden extra` }).where(eq(purchaseOrderItems.id, line!.id));
    const res = await owner.post(`/intents/${approval.body.certificate.id}/paypal-order`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CERTIFICATE_INVALID");
    const v = await owner.get(`/intents/${approval.body.certificate.id}/verify`);
    expect(v.body.status).toBe("CART_MODIFIED");
  });

  it("revokes outstanding approvals when the owner tightens the mandate", async () => {
    // Earlier tests consumed most of the $500 week; loosening first must not revoke anything.
    const before = (await owner.get("/mandates/current")).body.mandate;
    const loosen = await owner.put("/mandates/current", { ...mandateInput(before), weekly_budget_minor: 100_000 });
    expect(loosen.status).toBe(200);
    expect(loosen.body.revoked_certificates).toBe(0);
    expect(loosen.body.budget.limit_minor).toBe(100_000);
    await drawDown("PKG-NAPKINS", 200);
    const r = await newResearchedRequest("Restock napkins");
    const p = r.proposals.find((x) => x.status === "PROPOSED")!;
    const approval = await approve(r, p);
    expect(approval.status).toBe(200);
    const current = (await owner.get("/mandates/current")).body.mandate;
    const put = await owner.put("/mandates/current", { ...mandateInput(current), per_order_limit_minor: 3_000, auto_approval_limit_minor: 1_000 });
    expect(put.status).toBe(200);
    expect(put.body.revoked_certificates).toBeGreaterThanOrEqual(1);
    const v = await owner.get(`/intents/${approval.body.certificate.id}/verify`);
    expect(v.body.status).toBe("MANDATE_CHANGED");
    const pay = await owner.post(`/intents/${approval.body.certificate.id}/paypal-order`);
    expect(pay.status).toBe(422);

    // Stale edits are rejected with optimistic concurrency.
    const stale = await owner.put("/mandates/current", { ...mandateInput(put.body.mandate), expected_version: current.version });
    expect(stale.status).toBe(409);
  });

  it("rejects mandate changes from non-owners", async () => {
    const viewer = await h.agent("viewer");
    const res = await viewer.put("/mandates/current", {});
    expect(res.status).toBe(403);
  });

  it("requires authentication, CSRF header and idempotency keys", async () => {
    expect((await request(h.app).get("/api/v1/inventory")).status).toBe(401);
    const noCsrf = await request(h.app).post("/api/v1/auth/login").send({ email: "a@b.co", password: "whatever-123" });
    expect(noCsrf.status).toBe(403);
    const r = await owner.post("/procurement/requests", { instruction: "Restock gloves" }, "");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("replays idempotent requests and rejects key reuse with a different body", async () => {
    const key = "idem-test-key-0001";
    const a = await owner.post("/procurement/requests", { instruction: "Restock gloves" }, key);
    const b = await owner.post("/procurement/requests", { instruction: "Restock gloves" }, key);
    expect(b.status).toBe(a.status);
    expect(b.body.id).toBe(a.body.id);
    expect(b.headers["idempotent-replayed"]).toBe("true");
    const c = await owner.post("/procurement/requests", { instruction: "Restock oil" }, key);
    expect(c.status).toBe(422);
  });

  it("isolates tenants: unknown ids are not found", async () => {
    expect((await owner.get("/procurement/requests/00000000-0000-4000-8000-000000000000")).status).toBe(404);
    expect((await owner.get("/procurement/requests/not-a-uuid")).status).toBe(404);
  });
});
