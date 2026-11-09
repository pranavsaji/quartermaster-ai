import { and, desc, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type {
  Page,
  DeliveryDto,
  IntentCertificateDto,
  IntentCertificatePayload,
  PaymentDto,
  PolicyDecisionDto,
  ProductCategory,
  PurchaseOrderDto,
  ViolationDto,
} from "@qm/contracts";
import {
  deliveries,
  intentCertificates,
  paymentAttempts,
  policyDecisions,
  purchaseOrderItems,
  purchaseOrders,
  suppliers,
  type DbOrTx,
} from "@qm/database";
import { computeCartHash, type Cart, type CartLine } from "@qm/trustrail";
import { notFound } from "../errors";
import { afterCursor, decodeCursor, newestFirst, toPage } from "./pagination";

export type PurchaseOrderRow = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItemRow = typeof purchaseOrderItems.$inferSelect;

export interface ProposalLineMeta {
  inventory_item_id: string | null;
  catalog_item_id: string | null;
  pack_quantity: number | null;
}

function orderNumber(now: Date): string {
  return `PO-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Persists a planned cart as an immutable proposal with its own line items and snapshot. */
export async function createProposal(
  tx: DbOrTx,
  args: {
    organizationId: string;
    requestId: string | null;
    cart: Cart;
    lineMeta: ProposalLineMeta[];
    snapshot: Record<string, unknown>;
    planAttempt: number;
    now: Date;
  },
): Promise<PurchaseOrderRow> {
  const cartHash = computeCartHash(args.cart);
  const [po] = await tx
    .insert(purchaseOrders)
    .values({
      organizationId: args.organizationId,
      requestId: args.requestId,
      supplierId: args.cart.supplier_id,
      number: orderNumber(args.now),
      status: "PROPOSED",
      currency: args.cart.currency,
      subtotalMinor: args.cart.subtotal_minor,
      shippingMinor: args.cart.shipping_minor,
      taxMinor: args.cart.tax_minor,
      feesMinor: args.cart.fees_minor,
      totalMinor: args.cart.total_minor,
      cartHash,
      cartSnapshot: { cart: args.cart, cart_hash: cartHash, ...args.snapshot },
      planAttempt: args.planAttempt,
    })
    .returning();
  await tx.insert(purchaseOrderItems).values(
    args.cart.lines.map((l, i) => ({
      organizationId: args.organizationId,
      purchaseOrderId: po!.id,
      position: i,
      kind: l.kind,
      sku: l.sku,
      description: l.description,
      category: l.category,
      quantity: l.quantity,
      unitPriceMinor: l.unit_price_minor,
      lineTotalMinor: l.line_total_minor,
      recurring: l.recurring === true,
      inventoryItemId: args.lineMeta[i]?.inventory_item_id ?? null,
      catalogItemId: args.lineMeta[i]?.catalog_item_id ?? null,
      packQuantity: args.lineMeta[i]?.pack_quantity ?? null,
    })),
  );
  return po!;
}

/** Rebuilds the cart from persisted rows. Used to detect any change after approval. */
export function cartFromRows(po: PurchaseOrderRow, items: PurchaseOrderItemRow[]): Cart {
  const lines: CartLine[] = [...items]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      kind: i.kind,
      sku: i.sku,
      description: i.description,
      category: (i.category as ProductCategory | null) ?? null,
      quantity: i.quantity,
      unit_price_minor: i.unitPriceMinor,
      line_total_minor: i.lineTotalMinor,
      recurring: i.recurring,
    }));
  // Header totals are taken from the stored row (not recomputed) so tampering with either the
  // lines or the header changes the hash.
  return {
    supplier_id: po.supplierId,
    currency: po.currency,
    lines,
    subtotal_minor: po.subtotalMinor,
    shipping_minor: po.shippingMinor,
    tax_minor: po.taxMinor,
    fees_minor: po.feesMinor,
    total_minor: po.totalMinor,
  };
}

export async function loadOrder(db: DbOrTx, organizationId: string, id: string, lock = false) {
  const q = db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId)));
  const [po] = lock ? await q.for("update") : await q;
  if (!po) throw notFound("Purchase order");
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, po.id))
    .orderBy(purchaseOrderItems.position);
  return { po, items };
}

/* ------------------------------------------------------------------ DTO mapping */

export function toDecisionDto(d: typeof policyDecisions.$inferSelect): PolicyDecisionDto {
  return {
    id: d.id,
    purchase_order_id: d.purchaseOrderId,
    decision: d.decision,
    violations: d.violations as ViolationDto[],
    checks: d.checks as PolicyDecisionDto["checks"],
    human_approval_required: d.humanApprovalRequired,
    mandate_version: d.mandateVersion,
    policy_version: d.policyVersion,
    input_digest: d.inputDigest,
    evaluated_at: d.createdAt.toISOString(),
  };
}

export function toCertificateDto(c: typeof intentCertificates.$inferSelect): IntentCertificateDto {
  return {
    id: c.id,
    status: c.status,
    payload: c.payload as unknown as IntentCertificatePayload,
    key_id: c.keyId,
    signature: c.signature,
    algorithm: "Ed25519",
    issued_at: c.issuedAt.toISOString(),
    expires_at: c.expiresAt.toISOString(),
  };
}

export function toPaymentDto(p: typeof paymentAttempts.$inferSelect): PaymentDto {
  return {
    id: p.id,
    intent_id: p.intentId,
    purchase_order_id: p.purchaseOrderId,
    status: p.status,
    paypal_order_id: p.paypalOrderId,
    paypal_capture_id: p.paypalCaptureId,
    amount_minor: p.amountMinor,
    currency: p.currency,
    captured_amount_minor: p.capturedAmountMinor,
    refunded_amount_minor: p.refundedAmountMinor,
    failure_code: p.failureCode,
    failure_message: p.failureMessage,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    completed_at: p.completedAt?.toISOString() ?? null,
  };
}

export function toDeliveryDto(d: typeof deliveries.$inferSelect): DeliveryDto {
  return {
    id: d.id,
    purchase_order_id: d.purchaseOrderId,
    supplier_id: d.supplierId,
    status: d.status,
    expected_date: d.expectedDate,
    original_expected_date: d.originalExpectedDate,
    delivered_at: d.deliveredAt?.toISOString() ?? null,
    delay_reason: d.delayReason,
    data_source: "SYNTHETIC",
  };
}

/** Loads full DTOs for a set of orders with a constant number of queries. */
export async function orderDtos(db: DbOrTx, organizationId: string, pos: PurchaseOrderRow[]): Promise<PurchaseOrderDto[]> {
  if (pos.length === 0) return [];
  const ids = pos.map((p) => p.id);
  const [items, decisions, certs, payments, dels, sups] = await Promise.all([
    db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.purchaseOrderId, ids)).orderBy(purchaseOrderItems.position),
    db
      .select()
      .from(policyDecisions)
      .where(inArray(policyDecisions.purchaseOrderId, ids))
      .orderBy(desc(policyDecisions.createdAt), desc(policyDecisions.seq)),
    db.select().from(intentCertificates).where(inArray(intentCertificates.purchaseOrderId, ids)).orderBy(desc(intentCertificates.issuedAt)),
    db.select().from(paymentAttempts).where(inArray(paymentAttempts.purchaseOrderId, ids)).orderBy(desc(paymentAttempts.createdAt)),
    db.select().from(deliveries).where(inArray(deliveries.purchaseOrderId, ids)),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(eq(suppliers.organizationId, organizationId)),
  ]);
  const supplierName = new Map(sups.map((s) => [s.id, s.name]));
  return pos.map((po) => {
    const d = decisions.find((x) => x.purchaseOrderId === po.id);
    const c = certs.find((x) => x.purchaseOrderId === po.id);
    const p = payments.find((x) => x.purchaseOrderId === po.id);
    const del = dels.find((x) => x.purchaseOrderId === po.id);
    return {
      id: po.id,
      number: po.number,
      request_id: po.requestId,
      supplier_id: po.supplierId,
      supplier_name: supplierName.get(po.supplierId) ?? "Unknown supplier",
      status: po.status,
      currency: po.currency,
      subtotal_minor: po.subtotalMinor,
      shipping_minor: po.shippingMinor,
      tax_minor: po.taxMinor,
      fees_minor: po.feesMinor,
      total_minor: po.totalMinor,
      cart_hash: po.cartHash,
      items: items
        .filter((i) => i.purchaseOrderId === po.id)
        .map((i) => ({
          id: i.id,
          kind: i.kind,
          sku: i.sku,
          description: i.description,
          category: (i.category as ProductCategory | null) ?? null,
          quantity: i.quantity,
          unit_price_minor: i.unitPriceMinor,
          line_total_minor: i.lineTotalMinor,
          inventory_item_id: i.inventoryItemId,
          pack_quantity: i.packQuantity,
        })),
      policy_decision: d ? toDecisionDto(d) : null,
      certificate: c ? toCertificateDto(c) : null,
      payment: p ? toPaymentDto(p) : null,
      delivery: del ? toDeliveryDto(del) : null,
      created_at: po.createdAt.toISOString(),
    };
  });
}

/** Purchase orders newest first, with keyset pagination. */
export async function listOrders(
  db: DbOrTx,
  organizationId: string,
  q: { limit: number; cursor?: string },
): Promise<Page<PurchaseOrderDto>> {
  const rows = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.organizationId, organizationId),
        afterCursor(purchaseOrders.createdAt, purchaseOrders.id, decodeCursor(q.cursor)),
      ),
    )
    .orderBy(...newestFirst(purchaseOrders.createdAt, purchaseOrders.id))
    .limit(q.limit + 1);
  const { page, nextCursor } = toPage(rows, q.limit);
  return { items: await orderDtos(db, organizationId, page), next_cursor: nextCursor };
}
