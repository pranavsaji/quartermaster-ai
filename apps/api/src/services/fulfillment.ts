import { and, desc, eq, sql } from "drizzle-orm";
import { formatDate } from "@qm/integrations";
import type { DelayDeliveryRequest, DeliveryDto, ReceiveDeliveryRequest } from "@qm/contracts";
import { deliveries, goodsReceipts, inventoryItems, purchaseOrderItems, stockMovements, type DbOrTx } from "@qm/database";
import type { AppContext } from "../context";
import { conflict, notFound, unprocessable } from "../errors";
import { appendAudit } from "./audit";
import { toDeliveryDto } from "./orders";
import { setOrderStatus } from "./order-status";
import { AfterCommit, type Actor } from "./common";

export async function listDeliveries(db: DbOrTx, organizationId: string): Promise<DeliveryDto[]> {
  const rows = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.organizationId, organizationId))
    .orderBy(desc(deliveries.createdAt))
    .limit(200);
  return rows.map(toDeliveryDto);
}

/**
 * Confirms receipt of goods. Inventory increases only here — never on payment — and only by
 * the units actually received (never more than were ordered).
 */
export async function receiveDelivery(
  ctx: AppContext,
  actor: Actor,
  deliveryId: string,
  input: ReceiveDeliveryRequest,
): Promise<DeliveryDto> {
  return ctx.db.transaction(async (tx) => {
    const now = ctx.now();
    const [d] = await tx
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.id, deliveryId), eq(deliveries.organizationId, actor.organizationId)))
      .for("update");
    if (!d) throw notFound("Delivery");
    if (d.status === "DELIVERED" || d.status === "CANCELLED") throw conflict("DELIVERY_CLOSED", `Delivery is ${d.status}.`);
    const lines = await tx
      .select()
      .from(purchaseOrderItems)
      .where(and(eq(purchaseOrderItems.purchaseOrderId, d.purchaseOrderId), eq(purchaseOrderItems.kind, "PRODUCT")));
    const prior = await tx
      .select({ id: goodsReceipts.purchaseOrderItemId, units: sql<number>`coalesce(sum(${goodsReceipts.unitsReceived}),0)::int` })
      .from(goodsReceipts)
      .where(eq(goodsReceipts.deliveryId, d.id))
      .groupBy(goodsReceipts.purchaseOrderItemId);
    const priorBy = new Map(prior.map((p) => [p.id, Number(p.units)]));

    for (const r of input.lines) {
      const line = lines.find((l) => l.id === r.purchase_order_item_id);
      if (!line) throw unprocessable("UNKNOWN_LINE", "A received line is not a product on this order.");
      const ordered = line.quantity * (line.packQuantity ?? 1);
      const already = priorBy.get(line.id) ?? 0;
      if (already + r.quantity_received > ordered)
        throw unprocessable("OVER_RECEIPT", `Cannot receive more than the ${ordered} units ordered for ${line.sku}.`);
      if (r.quantity_received === 0) continue;
      await tx.insert(goodsReceipts).values({
        organizationId: actor.organizationId,
        deliveryId: d.id,
        purchaseOrderItemId: line.id,
        unitsReceived: r.quantity_received,
        receivedBy: actor.id,
        note: input.note ?? null,
      });
      if (line.inventoryItemId) {
        await tx
          .update(inventoryItems)
          .set({ onHand: sql`${inventoryItems.onHand} + ${r.quantity_received}`, updatedAt: now })
          .where(eq(inventoryItems.id, line.inventoryItemId));
        await tx.insert(stockMovements).values({
          organizationId: actor.organizationId,
          inventoryItemId: line.inventoryItemId,
          quantityDelta: r.quantity_received,
          reason: "GOODS_RECEIPT",
          referenceType: "delivery",
          referenceId: d.id,
          createdBy: actor.id,
        });
      }
      priorBy.set(line.id, already + r.quantity_received);
    }

    const complete = lines.every((l) => (priorBy.get(l.id) ?? 0) >= l.quantity * (l.packQuantity ?? 1));
    await tx
      .update(deliveries)
      .set({ status: complete ? "DELIVERED" : "IN_TRANSIT", deliveredAt: complete ? now : null, updatedAt: now })
      .where(eq(deliveries.id, d.id));
    if (complete) {
      await setOrderStatus(tx, d.purchaseOrderId, ["PAID"], "FULFILLED", now);
    }
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: complete ? "fulfillment.delivered" : "fulfillment.partially_received",
      actorType: "USER",
      actorId: actor.id,
      entityType: "delivery",
      entityId: d.id,
      data: { lines: input.lines, synthetic: true },
    });
    const [updated] = await tx.select().from(deliveries).where(eq(deliveries.id, d.id));
    return toDeliveryDto(updated!);
  });
}

/** Records a supplier delay. Projected availability moves; no inventory is invented. */
export async function delayDelivery(ctx: AppContext, actor: Actor, deliveryId: string, input: DelayDeliveryRequest): Promise<DeliveryDto> {
  const after = new AfterCommit();
  const result = await ctx.db.transaction(async (tx) => {
    const [d] = await tx
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.id, deliveryId), eq(deliveries.organizationId, actor.organizationId)))
      .for("update");
    if (!d) throw notFound("Delivery");
    if (!["SCHEDULED", "IN_TRANSIT", "DELAYED"].includes(d.status)) throw conflict("DELIVERY_CLOSED", `Delivery is ${d.status}.`);
    if (input.new_expected_date <= d.expectedDate) throw unprocessable("DELAY_DATE_INVALID", "A delay must move the expected date later.");
    await tx
      .update(deliveries)
      .set({ status: "DELAYED", expectedDate: input.new_expected_date, delayReason: input.reason, updatedAt: ctx.now() })
      .where(eq(deliveries.id, d.id));
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "fulfillment.delayed",
      actorType: "USER",
      actorId: actor.id,
      entityType: "delivery",
      entityId: d.id,
      data: { from: d.expectedDate, to: input.new_expected_date, reason: input.reason },
    });
    after.add(() =>
      ctx.notifier.send({
        kind: "DELIVERY_DELAYED",
        organization_id: actor.organizationId,
        title: "Delivery delayed",
        summary: `A delivery is now expected on ${formatDate(input.new_expected_date)}. The change and its reason are in the audit log.`,
        link_path: "/deliveries",
        details: [
          { label: "Was expected", value: formatDate(d.expectedDate) },
          { label: "Now expected", value: formatDate(input.new_expected_date) },
          { label: "Reason", value: input.reason },
        ],
      }),
    );
    const [updated] = await tx.select().from(deliveries).where(eq(deliveries.id, d.id));
    return toDeliveryDto(updated!);
  });
  after.flush(ctx);
  return result;
}
