import { expect } from "vitest";
import type { InventoryItemDto, ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
import type { Client, Harness } from "./harness";

/**
 * Purchase-flow building blocks shared by integration tests. Each test that buys something should
 * use its own SKU: the forecast treats paid-but-undelivered orders as inbound stock, so a second
 * purchase of the same SKU in one file may find nothing to reorder.
 */

const MANDATE_KEYS = [
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
] as const;

/** Instruction that the deterministic interpreter maps to each seeded SKU. */
export const RESTOCK: Record<string, string> = {
  "CLN-GLOVES": "Restock nitrile gloves",
  "CLN-TOWELS": "Restock paper towels",
  "ING-CANOLA": "Restock canola frying oil",
  "PKG-NAPKINS": "Restock dinner napkins",
  "PKG-TAKEOUT-32": "Restock takeout containers",
};

/** Stock levels that put each seeded SKU at or below its reorder point. */
const LOW_STOCK: Record<string, number> = {
  "CLN-GLOVES": 5,
  "CLN-TOWELS": 5,
  "ING-CANOLA": 10,
  "PKG-NAPKINS": 5,
  "PKG-TAKEOUT-32": 120,
};

export async function currentMandate(client: Client): Promise<Record<string, unknown>> {
  const res = await client.get("/mandates/current");
  expect(res.status).toBe(200);
  return res.body.mandate as Record<string, unknown>;
}

/** Updates the active mandate (owner only), keeping every field not overridden. */
export async function updateMandate(owner: Client, overrides: Record<string, unknown>) {
  const m = await currentMandate(owner);
  const body = { ...Object.fromEntries(MANDATE_KEYS.map((k) => [k, m[k]])), ...overrides, expected_version: m.version };
  const res = await owner.put("/mandates/current", body);
  expect(res.status).toBe(200);
  return res.body.mandate as Record<string, unknown>;
}

/** A roomy weekly budget and no duplicate window, so independent purchases do not interfere. */
export async function relaxMandate(owner: Client) {
  return updateMandate(owner, { weekly_budget_minor: 1_000_000, duplicate_window_hours: 0 });
}

export async function inventoryItem(client: Client, sku: string): Promise<InventoryItemDto> {
  const res = await client.get("/inventory");
  expect(res.status).toBe(200);
  const item = (res.body.items as InventoryItemDto[]).find((i) => i.sku === sku);
  expect(item, `seeded SKU ${sku}`).toBeTruthy();
  return item!;
}

/** Sets an item's on-hand stock (via a count correction) so the test does not depend on order. */
export async function setStock(client: Client, sku: string, to: number) {
  const item = await inventoryItem(client, sku);
  if (item.on_hand === to) return;
  const res = await client.post(`/inventory/${item.id}/adjustments`, { quantity_delta: to - item.on_hand, reason: "COUNT_CORRECTION" });
  expect(res.status).toBe(200);
}

export const reviewCodes = (p: PurchaseOrderDto) =>
  (p.policy_decision?.violations ?? []).filter((v) => v.severity === "REVIEW").map((v) => v.code);

export async function createRequest(owner: Client, instruction: string, extra: Record<string, unknown> = {}) {
  const res = await owner.post("/procurement/requests", { instruction, ...extra });
  expect(res.status).toBe(201);
  return res.body as ProcurementRequestDto;
}

export async function research(owner: Client, requestId: string) {
  const res = await owner.post(`/procurement/requests/${requestId}/research`);
  expect(res.status).toBe(200);
  return res.body as ProcurementRequestDto;
}

/** Draws the SKU's stock down and researches a restock; returns the request and its first open proposal. */
export async function proposed(owner: Client, sku: string, extra: Record<string, unknown> = {}) {
  await setStock(owner, sku, LOW_STOCK[sku]!);
  const created = await createRequest(owner, RESTOCK[sku]!, extra);
  const request = await research(owner, created.id);
  const proposal = request.proposals.find((p) => p.status === "PROPOSED");
  expect(proposal, `a compliant proposal for ${sku}`).toBeTruthy();
  return { request, proposal: proposal! };
}

export function approve(owner: Client, requestId: string, p: PurchaseOrderDto, overrides: Record<string, unknown> = {}) {
  return owner.post(`/procurement/requests/${requestId}/approve`, {
    purchase_order_id: p.id,
    cart_hash: p.cart_hash,
    acknowledged_review_codes: reviewCodes(p),
    ...overrides,
  });
}

export async function approvedIntent(owner: Client, sku: string) {
  const { request, proposal } = await proposed(owner, sku);
  const res = await approve(owner, request.id, proposal);
  expect(res.status).toBe(200);
  return { requestId: request.id, proposal, intentId: res.body.certificate.id as string, total: proposal.total_minor };
}

export async function approvedOrder(owner: Client, sku: string) {
  const a = await approvedIntent(owner, sku);
  const res = await owner.post(`/intents/${a.intentId}/paypal-order`);
  expect(res.status).toBe(200);
  return { ...a, paymentId: res.body.payment.id as string, paypalOrderId: res.body.paypal_order_id as string };
}

export async function paidOrder(h: Harness, owner: Client, sku: string) {
  const o = await approvedOrder(owner, sku);
  h.paypal.approve(o.paypalOrderId);
  const res = await owner.post(`/payments/${o.paymentId}/capture`, { paypal_order_id: o.paypalOrderId });
  expect(res.status).toBe(200);
  expect(res.body.payment.status).toBe("COMPLETED");
  const po = (await owner.get(`/purchase-orders/${o.proposal.id}`)).body as PurchaseOrderDto;
  return { ...o, po };
}
