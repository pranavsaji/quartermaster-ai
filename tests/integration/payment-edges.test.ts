import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  budgetReservations,
  intentCertificates,
  memberships,
  paymentAttempts,
  purchaseOrders,
  securityFindings,
  users,
} from "@qm/database";
import type { PayPalOrder } from "@qm/payments";
import { reconcilePayment, voidAbandonedCapture } from "../../apps/api/src/services/payments";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedIntent, approvedOrder, paidOrder, relaxMandate } from "../helpers/flows";

/**
 * Payment paths beyond the happy flow: provider-side voids and declines, pending and
 * mismatched captures, order-creation failures, and who may pay for an approval.
 * A SKU is only re-used after its earlier order in this file ended unpaid (see helpers/flows.ts).
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

async function rows(o: { intentId: string; paymentId: string; proposal: { id: string } }) {
  const [payment] = await h.ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.id, o.paymentId));
  const [cert] = await h.ctx.db.select().from(intentCertificates).where(eq(intentCertificates.id, o.intentId));
  const [reservation] = await h.ctx.db.select().from(budgetReservations).where(eq(budgetReservations.intentId, o.intentId));
  const [po] = await h.ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, o.proposal.id));
  return { payment: payment!, cert: cert!, reservation: reservation!, po: po! };
}

const storedOrder = (id: string): PayPalOrder => h.paypal.orders.get(id)!.order;
const firstCapture = (id: string) => storedOrder(id).purchase_units![0]!.payments!.captures![0]!;

describe("reconciliation with PayPal's view of the order", () => {
  it("records buyer approval, then unwinds everything when PayPal voids the order", async () => {
    const o = await approvedOrder(owner, "CLN-GLOVES");
    h.paypal.approve(o.paypalOrderId);
    expect(await reconcilePayment(h.ctx, o.paymentId)).toBe("PAYER_APPROVED");
    // Reconciling again is harmless.
    expect(await reconcilePayment(h.ctx, o.paymentId)).toBe("PAYER_APPROVED");

    (storedOrder(o.paypalOrderId) as { status: string }).status = "VOIDED";
    expect(await reconcilePayment(h.ctx, o.paymentId)).toBe("VOIDED");
    const s = await rows(o);
    expect(s.payment.failureCode).toBe("PAYPAL_ORDER_VOIDED");
    expect(s.payment.lastReconciledAt).not.toBeNull();
    expect(s.cert.status).toBe("REVOKED");
    expect(s.reservation.status).toBe("RELEASED");
    expect(s.po.status).toBe("CANCELLED");

    // A voided payment cannot be paid again under the same approval.
    const again = await owner.post(`/intents/${o.intentId}/paypal-order`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("PAYMENT_NOT_CREATABLE");
  });

  it("treats unknown payments as failed and payments without a PayPal order as unchanged", async () => {
    expect(await reconcilePayment(h.ctx, "00000000-0000-4000-8000-000000000000")).toBe("FAILED");
    expect(await voidAbandonedCapture(h.ctx, "00000000-0000-4000-8000-000000000000")).toBe("FAILED");
    expect((await owner.get("/payments/00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });
});

describe("order creation failures", () => {
  it("records a dropped connection as retryable, and the retry creates exactly one order", async () => {
    const a = await approvedIntent(owner, "CLN-TOWELS");
    h.paypal.failNextCreate = "network";
    const failed = await owner.post(`/intents/${a.intentId}/paypal-order`);
    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe("PAYPAL_ORDER_FAILED");
    // 5xx responses expose only non-string details; the failure code is kept on the payment.
    expect(failed.body.error.details).toEqual({ retryable: true });

    const [attempt] = await h.ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.intentId, a.intentId));
    expect(attempt).toMatchObject({ status: "CREATED", paypalOrderId: null, failureCode: "PAYPAL_UNREACHABLE" });
    expect(attempt!.failureMessage).toBe("PayPal could not be reached.");
    // Without a PayPal order there is nothing to reconcile.
    expect(await reconcilePayment(h.ctx, attempt!.id)).toBe("CREATED");

    const retry = await owner.post(`/intents/${a.intentId}/paypal-order`);
    expect(retry.status).toBe(200);
    expect(retry.body.payment.id).toBe(attempt!.id);
    expect(retry.body.payment.failure_code).toBeNull();
    expect(retry.body.payment.status).toBe("ORDER_CREATED");
  });

  it("records a definitive PayPal rejection as not retryable", async () => {
    const a = await approvedIntent(owner, "ING-CANOLA");
    h.paypal.failNextCreate = { status: 422, issue: "PAYEE_ACCOUNT_RESTRICTED" };
    const failed = await owner.post(`/intents/${a.intentId}/paypal-order`);
    expect(failed.status).toBe(502);
    expect(failed.body.error.details).toEqual({ retryable: false });
    const [attempt] = await h.ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.intentId, a.intentId));
    expect(attempt!.failureCode).toBe("PAYEE_ACCOUNT_RESTRICTED");
    expect(attempt!.failureMessage).toBe("PayPal reported PAYEE_ACCOUNT_RESTRICTED.");
  });
});

describe("who may pay", () => {
  it("only lets the owner who approved a purchase create its PayPal order or capture it", async () => {
    const o = await approvedOrder(owner, "PKG-NAPKINS");
    h.paypal.approve(o.paypalOrderId);
    const [manager] = await h.ctx.db.select().from(users).where(eq(users.email, "manager@demo.quartermaster.dev"));
    const membership = eq(memberships.userId, manager!.id);
    await h.ctx.db.update(memberships).set({ role: "OWNER" }).where(membership);
    try {
      const coOwner = await h.agent("manager");
      const create = await coOwner.post(`/intents/${o.intentId}/paypal-order`);
      expect(create.status).toBe(403);
      const capture = await coOwner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
      expect(capture.status).toBe(403);
    } finally {
      await h.ctx.db.update(memberships).set({ role: "MANAGER" }).where(membership);
    }
    expect((await rows(o)).payment.status).toBe("ORDER_CREATED");
    expect(h.paypal.captureCount).toBe(0);
  });
});

describe("capture outcomes", () => {
  it("fails the payment and releases the budget when PayPal reports the capture declined", async () => {
    const o = await approvedOrder(owner, "PKG-TAKEOUT-32");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.captureStatus = "DECLINED";
    const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("FAILED");
    expect(res.body.payment.failure_code).toBe("CAPTURE_DECLINED");
    const s = await rows(o);
    expect(s.reservation.status).toBe("RELEASED");
    expect(s.cert.status).toBe("REVOKED");
    expect(s.po.status).toBe("CANCELLED");
  });
});

describe("pending and mismatched captures", () => {
  // These tests re-use SKUs whose earlier orders in this file were never paid, so nothing is
  // inbound and the forecast proposes a reorder again.

  it("holds a PENDING capture until PayPal completes it, then records it once", async () => {
    const o = await approvedOrder(owner, "CLN-TOWELS");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.captureStatus = "PENDING";
    const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("CAPTURE_PENDING");
    const captureId = firstCapture(o.paypalOrderId).id;
    expect(res.body.payment.paypal_capture_id).toBe(captureId);
    expect((await rows(o)).reservation.status).toBe("ACTIVE");

    // Still pending at PayPal: nothing changes.
    expect(await reconcilePayment(h.ctx, o.paymentId)).toBe("CAPTURE_PENDING");
    // While the approval is still valid, an abandoned-capture check leaves it alone too.
    expect(await voidAbandonedCapture(h.ctx, o.paymentId)).toBe("CAPTURE_PENDING");

    // An expired approval with a pending capture at PayPal still waits for the capture.
    await h.ctx.db
      .update(intentCertificates)
      .set({ expiresAt: new Date(h.clock.now.getTime() - 60_000) })
      .where(eq(intentCertificates.id, o.intentId));
    await h.ctx.db
      .update(paymentAttempts)
      .set({ updatedAt: new Date(h.clock.now.getTime() - 30 * 60_000) })
      .where(eq(paymentAttempts.id, o.paymentId));
    (storedOrder(o.paypalOrderId) as { status: string }).status = "APPROVED";
    expect(await voidAbandonedCapture(h.ctx, o.paymentId)).toBe("CAPTURE_PENDING");

    firstCapture(o.paypalOrderId).status = "COMPLETED";
    (storedOrder(o.paypalOrderId) as { status: string }).status = "COMPLETED";
    expect(await voidAbandonedCapture(h.ctx, o.paymentId)).toBe("COMPLETED");
    const s = await rows(o);
    expect(s.payment.paypalCaptureId).toBe(captureId);
    expect(s.reservation.status).toBe("CONSUMED");
    expect(s.po.status).toBe("PAID");
    // Completed payments are left alone by later checks.
    expect(await voidAbandonedCapture(h.ctx, o.paymentId)).toBe("COMPLETED");
    expect(await reconcilePayment(h.ctx, o.paymentId)).toBe("COMPLETED");
  });

  it("records a capture for a different amount than approved, with a critical finding", async () => {
    const o = await approvedOrder(owner, "ING-CANOLA");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.captureDirectly(o.paypalOrderId);
    firstCapture(o.paypalOrderId).amount.value = "1.00";
    expect(await reconcilePayment(h.ctx, o.paymentId)).toBe("COMPLETED");
    const s = await rows(o);
    expect(s.payment.capturedAmountMinor).toBe(100);
    expect(s.payment.failureCode).toBe("CAPTURED_AMOUNT_MISMATCH");
    const findings = await h.ctx.db
      .select()
      .from(securityFindings)
      .where(and(eq(securityFindings.sourceId, o.paymentId), eq(securityFindings.type, "PAYMENT_AMOUNT_MISMATCH")));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("CRITICAL");
  });
});

describe("capture requests that do not match the payment", () => {
  it("refuses a different PayPal order id for a settled payment, and a completed order that belongs elsewhere", async () => {
    const paid = await paidOrder(h, owner, "CLN-GLOVES");
    const mismatch = await owner.post(`/payments/${paid.paymentId}/capture`, { paypal_order_id: "SOME-OTHER-ORDER" });
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.error.code).toBe("ORDER_ID_MISMATCH");

    const open = await approvedOrder(owner, "PKG-NAPKINS");
    const foreign = await owner.post(`/payments/${open.paymentId}/capture`, { paypal_order_id: paid.paypalOrderId });
    expect(foreign.status).toBe(409);
    expect(foreign.body.error.code).toBe("ORDER_ID_MISMATCH");
    expect((await rows(open)).payment.status).toBe("ORDER_CREATED");
  });

  it("refuses a second capture while one is in flight, but re-arms a stale one", async () => {
    const o = await approvedOrder(owner, "PKG-TAKEOUT-32");
    h.paypal.approve(o.paypalOrderId);
    await h.ctx.db
      .update(paymentAttempts)
      .set({ status: "CAPTURE_PENDING", updatedAt: h.clock.now })
      .where(eq(paymentAttempts.id, o.paymentId));
    const busy = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(busy.status).toBe(409);
    expect(busy.body.error.code).toBe("CAPTURE_IN_PROGRESS");

    await h.ctx.db
      .update(paymentAttempts)
      .set({ updatedAt: new Date(h.clock.now.getTime() - 5 * 60_000) })
      .where(eq(paymentAttempts.id, o.paymentId));
    const rearmed = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
    expect(rearmed.status).toBe(200);
    expect(rearmed.body.payment.status).toBe("COMPLETED");
    expect(h.paypal.captureCount).toBeGreaterThanOrEqual(1);
  });
});
