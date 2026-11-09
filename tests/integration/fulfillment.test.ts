import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditEvents, deliveries, stockMovements } from "@qm/database";
import type { DeliveryDto, PurchaseOrderDto } from "@qm/contracts";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { inventoryItem, paidOrder, relaxMandate } from "../helpers/flows";

/** Receiving and delaying synthetic deliveries: inventory only moves on receipt, never past the order. */
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
});
afterAll(async () => {
  await h.close();
});

const productLine = (po: PurchaseOrderDto) => po.items.find((i) => i.kind === "PRODUCT")!;
const orderedUnits = (po: PurchaseOrderDto) => {
  const line = productLine(po);
  return line.quantity * (line.pack_quantity ?? 1);
};
const receive = (deliveryId: string, lines: { purchase_order_item_id: string; quantity_received: number }[], note?: string) =>
  owner.post(`/deliveries/${deliveryId}/receive`, { lines, ...(note ? { note } : {}) });

describe("receiving deliveries", () => {
  it("receives in parts, raises stock by exactly the units received and closes the delivery when complete", async () => {
    const { po } = await paidOrder(h, owner, "CLN-GLOVES");
    const line = productLine(po);
    const units = orderedUnits(po);
    expect(units).toBeGreaterThan(1);
    const before = await inventoryItem(owner, "CLN-GLOVES");
    expect(before.inbound_confirmed).toBe(units);

    const part = await receive(po.delivery!.id, [{ purchase_order_item_id: line.id, quantity_received: 1 }], "First pallet");
    expect(part.status).toBe(200);
    expect(part.body.delivery.status).toBe("IN_TRANSIT");
    expect(part.body.delivery.delivered_at).toBeNull();
    const mid = await inventoryItem(owner, "CLN-GLOVES");
    expect(mid.on_hand).toBe(before.on_hand + 1);
    expect(mid.inbound_confirmed).toBe(units - 1);

    // The remainder cannot exceed what is still outstanding.
    const over = await receive(po.delivery!.id, [{ purchase_order_item_id: line.id, quantity_received: units }]);
    expect(over.status).toBe(422);
    expect(over.body.error.code).toBe("OVER_RECEIPT");

    const rest = await receive(po.delivery!.id, [{ purchase_order_item_id: line.id, quantity_received: units - 1 }]);
    expect(rest.status).toBe(200);
    expect(rest.body.delivery.status).toBe("DELIVERED");
    expect(rest.body.delivery.delivered_at).not.toBeNull();
    const after = await inventoryItem(owner, "CLN-GLOVES");
    expect(after.on_hand).toBe(before.on_hand + units);
    expect(after.inbound_confirmed).toBe(0);

    const order = (await owner.get(`/purchase-orders/${po.id}`)).body as PurchaseOrderDto;
    expect(order.status).toBe("FULFILLED");
    expect((await owner.get(`/procurement/requests/${po.request_id}`)).body.status).toBe("FULFILLED");

    const movements = await h.ctx.db.select().from(stockMovements).where(eq(stockMovements.referenceId, po.delivery!.id));
    expect(movements.map((m) => m.quantityDelta).sort((a, b) => a - b)).toEqual([1, units - 1].sort((a, b) => a - b));
    const audit = await h.ctx.db.select().from(auditEvents).where(eq(auditEvents.entityId, po.delivery!.id));
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["fulfillment.partially_received", "fulfillment.delivered"]));

    // A closed delivery accepts neither more goods nor a delay.
    const again = await receive(po.delivery!.id, [{ purchase_order_item_id: line.id, quantity_received: 0 }]);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("DELIVERY_CLOSED");
    const delay = await owner.post(`/deliveries/${po.delivery!.id}/delay`, { new_expected_date: "2099-01-01", reason: "Late truck" });
    expect(delay.status).toBe(409);
    expect(delay.body.error.code).toBe("DELIVERY_CLOSED");
  });

  it("ignores zero-quantity lines and refuses lines that are not products on the order", async () => {
    const { po } = await paidOrder(h, owner, "CLN-TOWELS");
    const before = await inventoryItem(owner, "CLN-TOWELS");
    const zero = await receive(po.delivery!.id, [{ purchase_order_item_id: productLine(po).id, quantity_received: 0 }]);
    expect(zero.status).toBe(200);
    expect(zero.body.delivery.status).toBe("IN_TRANSIT");
    expect((await inventoryItem(owner, "CLN-TOWELS")).on_hand).toBe(before.on_hand);

    // The shipping line exists on the order but is not a product: it cannot be "received".
    const shipping = po.items.find((i) => i.kind !== "PRODUCT");
    const unknownIds = [shipping?.id, "00000000-0000-4000-8000-000000000000"].filter((x): x is string => Boolean(x));
    for (const id of unknownIds) {
      const res = await receive(po.delivery!.id, [{ purchase_order_item_id: id, quantity_received: 1 }]);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("UNKNOWN_LINE");
    }
    expect((await inventoryItem(owner, "CLN-TOWELS")).on_hand).toBe(before.on_hand);
  });

  it("validates the body and does not find deliveries that do not exist", async () => {
    const empty = await owner.post("/deliveries/00000000-0000-4000-8000-000000000000/receive", { lines: [] });
    expect(empty.status).toBe(400);
    const missing = await receive("00000000-0000-4000-8000-000000000000", [
      { purchase_order_item_id: "00000000-0000-4000-8000-000000000001", quantity_received: 1 },
    ]);
    expect(missing.status).toBe(404);
    const missingDelay = await owner.post("/deliveries/00000000-0000-4000-8000-000000000000/delay", {
      new_expected_date: "2099-01-01",
      reason: "x",
    });
    expect(missingDelay.status).toBe(404);
  });

  it("does not let a viewer receive or delay goods", async () => {
    const viewer = await h.agent("viewer");
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await viewer.post(`/deliveries/${id}/receive`, { lines: [] })).status).toBe(403);
    expect((await viewer.post(`/deliveries/${id}/delay`, { new_expected_date: "2099-01-01", reason: "x" })).status).toBe(403);
    // ...but can see the delivery list.
    expect((await viewer.get("/deliveries")).status).toBe(200);
  });
});

describe("delaying deliveries", () => {
  it("only moves the expected date later, records the reason and leaves stock untouched", async () => {
    const { po } = await paidOrder(h, owner, "ING-CANOLA");
    const d = po.delivery!;
    const before = await inventoryItem(owner, "ING-CANOLA");

    const same = await owner.post(`/deliveries/${d.id}/delay`, { new_expected_date: d.expected_date, reason: "No change" });
    expect(same.status).toBe(422);
    expect(same.body.error.code).toBe("DELAY_DATE_INVALID");
    const earlier = await owner.post(`/deliveries/${d.id}/delay`, { new_expected_date: "2000-01-01", reason: "Earlier" });
    expect(earlier.status).toBe(422);

    const later = new Date(`${d.expected_date}T00:00:00Z`);
    later.setUTCDate(later.getUTCDate() + 3);
    const newDate = later.toISOString().slice(0, 10);
    const res = await owner.post(`/deliveries/${d.id}/delay`, { new_expected_date: newDate, reason: "Supplier backorder" });
    expect(res.status).toBe(200);
    const delayed = res.body.delivery as DeliveryDto;
    expect(delayed).toMatchObject({ status: "DELAYED", expected_date: newDate, original_expected_date: d.expected_date });
    expect(delayed.delay_reason).toBe("Supplier backorder");
    expect((await inventoryItem(owner, "ING-CANOLA")).on_hand).toBe(before.on_hand);

    // A delayed delivery can be delayed again and still be received.
    later.setUTCDate(later.getUTCDate() + 1);
    const again = await owner.post(`/deliveries/${d.id}/delay`, { new_expected_date: later.toISOString().slice(0, 10), reason: "Again" });
    expect(again.status).toBe(200);
    const done = await receive(d.id, [{ purchase_order_item_id: productLine(po).id, quantity_received: orderedUnits(po) }]);
    expect(done.body.delivery.status).toBe("DELIVERED");

    const listed = (await owner.get("/deliveries")).body.items as DeliveryDto[];
    expect(listed.find((x) => x.id === d.id)).toMatchObject({ status: "DELIVERED", delay_reason: "Again" });
  });

  it("refuses to delay a cancelled delivery", async () => {
    const { po } = await paidOrder(h, owner, "PKG-NAPKINS");
    await h.ctx.db.update(deliveries).set({ status: "CANCELLED" }).where(eq(deliveries.id, po.delivery!.id));
    const res = await owner.post(`/deliveries/${po.delivery!.id}/delay`, { new_expected_date: "2099-01-01", reason: "x" });
    expect(res.status).toBe(409);
    const rec = await receive(po.delivery!.id, [{ purchase_order_item_id: productLine(po).id, quantity_received: 1 }]);
    expect(rec.status).toBe(409);
  });
});
