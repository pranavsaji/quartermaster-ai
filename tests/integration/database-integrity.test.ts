import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { budgetAccounts, paymentAttempts, purchaseOrders, purchaseRequests } from "@qm/database";
import type { ProcurementRequestDto } from "@qm/contracts";
import { createHarness, DEMO_INSTRUCTION, type Harness } from "../helpers/harness";

/** The database itself refuses states the application must never write. */
let h: Harness;

beforeAll(async () => {
  h = await createHarness();
  // Create one of everything through the API: request, proposals, budget account, payment.
  const owner = await h.agent("owner");
  const created = await owner.post("/procurement/requests", { instruction: DEMO_INSTRUCTION });
  const r = (await owner.post(`/procurement/requests/${created.body.id}/research`)).body as ProcurementRequestDto;
  const p = r.proposals.find((x) => x.status === "PROPOSED")!;
  const approval = await owner.post(`/procurement/requests/${r.id}/approve`, {
    purchase_order_id: p.id,
    cart_hash: p.cart_hash,
    acknowledged_review_codes: p.policy_decision!.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code),
  });
  expect((await owner.post(`/intents/${approval.body.certificate.id}/paypal-order`)).status).toBe(200);
});
afterAll(async () => {
  await h.close();
});

const rejection = (p: Promise<unknown>) => p.then(
  () => "accepted",
  (e: { cause?: { message?: string }; message?: string }) => e.cause?.message ?? e.message ?? "rejected",
);

describe("integrity constraints", () => {
  it("rejects unknown status values", async () => {
    const [req] = await h.ctx.db.select().from(purchaseRequests).limit(1);
    const [po] = await h.ctx.db.select().from(purchaseOrders).limit(1);
    expect(req && po).toBeTruthy();
    expect(await rejection(h.ctx.db.update(purchaseRequests).set({ status: "PAYMENT_PENDNG" as never }).where(eq(purchaseRequests.id, req!.id)))).toMatch(/purchase_requests_status_ck/);
    expect(await rejection(h.ctx.db.update(purchaseOrders).set({ status: "LOST" as never }).where(eq(purchaseOrders.id, po!.id)))).toMatch(/purchase_orders_status_ck/);
    expect(await rejection(h.ctx.db.execute(sql`insert into payment_attempts (organization_id, intent_id, purchase_order_id, status, amount_minor, currency, created_by) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'DONE', 100, 'USD', gen_random_uuid())`))).toMatch(/payments_status_ck|violates/);
  });

  it("rejects negative budget figures", async () => {
    const [account] = await h.ctx.db.select().from(budgetAccounts).limit(1);
    expect(account).toBeTruthy();
    expect(await rejection(h.ctx.db.update(budgetAccounts).set({ reservedMinor: -1 }).where(eq(budgetAccounts.id, account!.id)))).toMatch(/budget_accounts_amounts_ck/);
  });

  it("rejects refunds larger than the captured amount", async () => {
    const [p] = await h.ctx.db.select().from(paymentAttempts).limit(1);
    expect(p).toBeTruthy();
    expect(await rejection(h.ctx.db.update(paymentAttempts).set({ capturedAmountMinor: 100, refundedAmountMinor: 101 }).where(eq(paymentAttempts.id, p!.id)))).toMatch(/payments_amounts_ck/);
  });

  it("rejects order totals that do not add up", async () => {
    const [po] = await h.ctx.db.select().from(purchaseOrders).limit(1);
    expect(po).toBeTruthy();
    expect(await rejection(h.ctx.db.update(purchaseOrders).set({ totalMinor: po!.totalMinor + 1 }).where(eq(purchaseOrders.id, po!.id)))).toMatch(/purchase_orders_amounts_ck/);
  });
});
