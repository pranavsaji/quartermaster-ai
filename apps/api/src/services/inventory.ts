import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { ForecastRunDto, InventoryAdjustmentRequest, InventoryItemDto, ProductCategory } from "@qm/contracts";
import {
  consumptionHistory,
  deliveries,
  forecastRuns,
  goodsReceipts,
  inventoryItems,
  purchaseOrderItems,
  purchaseOrders,
  stockMovements,
  suppliers,
  type DbOrTx,
} from "@qm/database";
import { averageDailyUsage, daysOfCover, forecast, stockStatus, type ForecastItemInput, type ForecastLine } from "@qm/quartermaster";
import { conflict, notFound } from "../errors";
import { appendAudit } from "./audit";

const HISTORY_DAYS = 14;
const DEFAULT_LEAD_TIME_DAYS = 2;

export type InventoryRow = typeof inventoryItems.$inferSelect;

interface LoadedItem {
  row: InventoryRow;
  input: ForecastItemInput;
}

/** Units on order (paid, not yet received) per inventory item. Never counts unpaid proposals. */
async function inboundByItem(db: DbOrTx, organizationId: string): Promise<Map<string, number>> {
  const lines = await db
    .select({
      itemId: purchaseOrderItems.id,
      inventoryItemId: purchaseOrderItems.inventoryItemId,
      quantity: purchaseOrderItems.quantity,
      pack: purchaseOrderItems.packQuantity,
    })
    .from(purchaseOrderItems)
    .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderItems.purchaseOrderId))
    .innerJoin(deliveries, eq(deliveries.purchaseOrderId, purchaseOrders.id))
    .where(
      and(
        eq(purchaseOrders.organizationId, organizationId),
        eq(purchaseOrderItems.kind, "PRODUCT"),
        inArray(purchaseOrders.status, ["PAID", "FULFILLED"]),
        inArray(deliveries.status, ["SCHEDULED", "IN_TRANSIT", "DELAYED"]),
      ),
    );
  if (lines.length === 0) return new Map();
  const received = await db
    .select({ poItemId: goodsReceipts.purchaseOrderItemId, units: sql<number>`sum(${goodsReceipts.unitsReceived})::int` })
    .from(goodsReceipts)
    .where(
      inArray(
        goodsReceipts.purchaseOrderItemId,
        lines.map((l) => l.itemId),
      ),
    )
    .groupBy(goodsReceipts.purchaseOrderItemId);
  const receivedBy = new Map(received.map((r) => [r.poItemId, Number(r.units)]));
  const out = new Map<string, number>();
  for (const l of lines) {
    if (!l.inventoryItemId) continue;
    const units = l.quantity * (l.pack ?? 1) - (receivedBy.get(l.itemId) ?? 0);
    if (units > 0) out.set(l.inventoryItemId, (out.get(l.inventoryItemId) ?? 0) + units);
  }
  return out;
}

export async function loadItems(db: DbOrTx, organizationId: string, now: Date, itemIds?: string[]): Promise<LoadedItem[]> {
  const where = itemIds?.length
    ? and(eq(inventoryItems.organizationId, organizationId), inArray(inventoryItems.id, itemIds))
    : eq(inventoryItems.organizationId, organizationId);
  const rows = await db.select().from(inventoryItems).where(where).orderBy(inventoryItems.sku);
  if (rows.length === 0) return [];

  const since = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
  const history = await db
    .select()
    .from(consumptionHistory)
    .where(
      and(
        eq(consumptionHistory.organizationId, organizationId),
        gte(consumptionHistory.day, since),
        inArray(
          consumptionHistory.inventoryItemId,
          rows.map((r) => r.id),
        ),
      ),
    )
    .orderBy(consumptionHistory.day);
  const supplierRows = await db
    .select({ id: suppliers.id, lead: suppliers.leadTimeDays })
    .from(suppliers)
    .where(eq(suppliers.organizationId, organizationId));
  const leadBySupplier = new Map(supplierRows.map((s) => [s.id, s.lead]));
  const inbound = await inboundByItem(db, organizationId);

  return rows.map((row) => {
    const usage = history.filter((h) => h.inventoryItemId === row.id).map((h) => h.quantity);
    const lead =
      row.leadTimeDaysOverride ??
      (row.preferredSupplierId ? leadBySupplier.get(row.preferredSupplierId) : undefined) ??
      DEFAULT_LEAD_TIME_DAYS;
    return {
      row,
      input: {
        inventory_item_id: row.id,
        sku: row.sku,
        name: row.name,
        unit: row.unit,
        on_hand: row.onHand,
        inbound_confirmed: inbound.get(row.id) ?? 0,
        committed: 0,
        daily_usage_history: usage,
        lead_time_days: lead,
        safety_stock: row.safetyStock,
        coverage_days: row.coverageDays,
      },
    };
  });
}

export function toInventoryDto(item: LoadedItem): InventoryItemDto {
  const { row, input } = item;
  const usage = averageDailyUsage(input.daily_usage_history);
  const available = input.on_hand + input.inbound_confirmed - input.committed;
  const reorderPoint = Math.ceil(usage * input.lead_time_days + input.safety_stock);
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category as ProductCategory,
    unit: row.unit,
    on_hand: input.on_hand,
    inbound_confirmed: input.inbound_confirmed,
    committed: input.committed,
    available,
    avg_daily_usage: usage,
    lead_time_days: input.lead_time_days,
    safety_stock: input.safety_stock,
    coverage_days: input.coverage_days,
    reorder_point: reorderPoint,
    days_of_cover: daysOfCover(available, usage),
    status: stockStatus(available, reorderPoint, input.safety_stock),
    preferred_supplier_id: row.preferredSupplierId,
    data_source: row.dataSource,
  };
}

export async function listInventory(db: DbOrTx, organizationId: string, now: Date): Promise<InventoryItemDto[]> {
  return (await loadItems(db, organizationId, now)).map(toInventoryDto);
}

export async function runForecast(
  db: DbOrTx,
  args: { organizationId: string; userId: string; demandMultiplier: number; itemIds?: string[]; requestId?: string | null; now: Date },
): Promise<{ run: ForecastRunDto; lines: ForecastLine[]; items: LoadedItem[] }> {
  const items = await loadItems(db, args.organizationId, args.now, args.itemIds);
  const lines = forecast(
    items.map((i) => i.input),
    args.demandMultiplier,
  );
  const [row] = await db
    .insert(forecastRuns)
    .values({
      organizationId: args.organizationId,
      requestId: args.requestId ?? null,
      demandMultiplier: args.demandMultiplier,
      lines,
      createdBy: args.userId,
    })
    .returning();
  return { run: toForecastDto(row!), lines, items };
}

export function toForecastDto(row: typeof forecastRuns.$inferSelect): ForecastRunDto {
  return {
    id: row.id,
    demand_multiplier: row.demandMultiplier,
    created_at: row.createdAt.toISOString(),
    method: "REORDER_POINT_V1",
    lines: row.lines as ForecastRunDto["lines"],
  };
}

export async function adjustInventory(
  tx: DbOrTx,
  args: { organizationId: string; userId: string; itemId: string; input: InventoryAdjustmentRequest; now: Date },
): Promise<InventoryItemDto> {
  const [item] = await tx
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, args.itemId), eq(inventoryItems.organizationId, args.organizationId)))
    .for("update");
  if (!item) throw notFound("Inventory item");
  const next = item.onHand + args.input.quantity_delta;
  if (next < 0) throw conflict("NEGATIVE_STOCK", `Adjustment would leave ${next} ${item.unit} on hand`);
  await tx.update(inventoryItems).set({ onHand: next, updatedAt: args.now }).where(eq(inventoryItems.id, item.id));
  await tx.insert(stockMovements).values({
    organizationId: args.organizationId,
    inventoryItemId: item.id,
    quantityDelta: args.input.quantity_delta,
    reason: args.input.reason,
    note: args.input.note ?? null,
    createdBy: args.userId,
  });
  await appendAudit(tx, {
    organizationId: args.organizationId,
    action: "inventory.adjusted",
    actorType: "USER",
    actorId: args.userId,
    entityType: "inventory_item",
    entityId: item.id,
    data: { sku: item.sku, delta: args.input.quantity_delta, reason: args.input.reason, on_hand: next },
  });
  const [loaded] = await loadItems(tx, args.organizationId, args.now, [item.id]);
  return toInventoryDto(loaded!);
}
