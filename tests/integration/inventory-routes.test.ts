import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { forecastRuns, spendMandates, stockMovements } from "@qm/database";
import type { ForecastRunDto, InventoryItemDto, SupplierDto } from "@qm/contracts";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { inventoryItem, setStock } from "../helpers/flows";

let h: Harness;
let owner: Client;
let manager: Client;
let viewer: Client;

beforeAll(async () => {
  h = await createHarness();
  [owner, manager, viewer] = await Promise.all([h.agent("owner"), h.agent("manager"), h.agent("viewer")]);
});
afterAll(async () => {
  await h.close();
});

describe("GET /inventory", () => {
  it("lists every seeded item with its derived planning figures to any member", async () => {
    const res = await viewer.get("/inventory");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const items = res.body.items as InventoryItemDto[];
    expect(items.map((i) => i.sku).sort()).toEqual(["CLN-GLOVES", "CLN-TOWELS", "ING-CANOLA", "PKG-NAPKINS", "PKG-TAKEOUT-32"]);
    for (const i of items) {
      expect(i.available).toBe(i.on_hand + i.inbound_confirmed - i.committed);
      expect(["OK", "LOW", "CRITICAL", "OUT"]).toContain(i.status);
    }
  });
});

describe("POST /inventory/:id/adjustments", () => {
  it("lets managers and owners adjust stock and records a stock movement", async () => {
    const item = await inventoryItem(owner, "CLN-TOWELS");
    const byManager = await manager.post(`/inventory/${item.id}/adjustments`, {
      quantity_delta: -3,
      reason: "WASTE",
      note: "Water damage",
    });
    expect(byManager.status).toBe(200);
    expect(byManager.body.item.on_hand).toBe(item.on_hand - 3);
    const byOwner = await owner.post(`/inventory/${item.id}/adjustments`, { quantity_delta: 5, reason: "MANUAL_RECEIPT" });
    expect(byOwner.status).toBe(200);
    expect(byOwner.body.item.on_hand).toBe(item.on_hand + 2);

    const moves = await h.ctx.db.select().from(stockMovements).where(eq(stockMovements.inventoryItemId, item.id));
    expect(moves.map((m) => m.quantityDelta)).toEqual(expect.arrayContaining([-3, 5]));
  });

  it("refuses viewers, invalid bodies, unknown items and negative stock", async () => {
    const item = await inventoryItem(owner, "CLN-GLOVES");
    const forbidden = await viewer.post(`/inventory/${item.id}/adjustments`, { quantity_delta: 1, reason: "COUNT_CORRECTION" });
    expect(forbidden.status).toBe(403);

    for (const body of [
      { quantity_delta: 0, reason: "COUNT_CORRECTION" },
      { quantity_delta: 1.5, reason: "COUNT_CORRECTION" },
      { quantity_delta: 1, reason: "THEFT" },
      {},
    ]) {
      const res = await owner.post(`/inventory/${item.id}/adjustments`, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }

    const unknown = await owner.post("/inventory/00000000-0000-4000-8000-000000000000/adjustments", {
      quantity_delta: 1,
      reason: "COUNT_CORRECTION",
    });
    expect(unknown.status).toBe(404);

    const negative = await owner.post(`/inventory/${item.id}/adjustments`, { quantity_delta: -(item.on_hand + 1), reason: "WASTE" });
    expect(negative.status).toBe(409);
    expect(negative.body.error.code).toBe("NEGATIVE_STOCK");
    expect((await inventoryItem(owner, "CLN-GLOVES")).on_hand).toBe(item.on_hand);
  });

  it("applies a retried adjustment once (idempotency key)", async () => {
    const item = await inventoryItem(owner, "PKG-NAPKINS");
    const key = `adjust-${item.id}`;
    const body = { quantity_delta: -10, reason: "CONSUMPTION" };
    const first = await owner.post(`/inventory/${item.id}/adjustments`, body, key);
    const retry = await owner.post(`/inventory/${item.id}/adjustments`, body, key);
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retry.headers["idempotent-replayed"]).toBe("true");
    expect(retry.body).toEqual(first.body);
    expect((await inventoryItem(owner, "PKG-NAPKINS")).on_hand).toBe(item.on_hand - 10);

    const missingKey = await owner.post(`/inventory/${item.id}/adjustments`, body, "");
    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });
});

describe("POST /inventory/forecast", () => {
  it("forecasts every item by default and records the run", async () => {
    await setStock(owner, "ING-CANOLA", 2);
    const res = await manager.post("/inventory/forecast");
    expect(res.status).toBe(200);
    const run = res.body as ForecastRunDto;
    expect(run.method).toBe("REORDER_POINT_V1");
    expect(run.demand_multiplier).toBe(1);
    expect(run.lines).toHaveLength(5);
    const oil = await inventoryItem(owner, "ING-CANOLA");
    const line = run.lines.find((l) => l.inventory_item_id === oil.id)!;
    expect(line.needs_reorder).toBe(true);
    expect(line.suggested_quantity).toBeGreaterThan(0);
    const [stored] = await h.ctx.db.select().from(forecastRuns).where(eq(forecastRuns.id, run.id));
    expect(stored).toBeTruthy();
  });

  it("scales demand and limits the run to the requested items", async () => {
    const oil = await inventoryItem(owner, "ING-CANOLA");
    const base = (await owner.post("/inventory/forecast", { inventory_item_ids: [oil.id] })).body as ForecastRunDto;
    const busy = await owner.post("/inventory/forecast", { inventory_item_ids: [oil.id], demand_multiplier: 2 });
    expect(busy.status).toBe(200);
    const run = busy.body as ForecastRunDto;
    expect(run.demand_multiplier).toBe(2);
    expect(run.lines.map((l) => l.inventory_item_id)).toEqual([oil.id]);
    expect(run.lines[0]!.suggested_quantity).toBeGreaterThanOrEqual(base.lines[0]!.suggested_quantity);
  });

  it("refuses viewers and out-of-range parameters", async () => {
    expect((await viewer.post("/inventory/forecast", {})).status).toBe(403);
    expect((await owner.post("/inventory/forecast", { demand_multiplier: 10 })).status).toBe(400);
    expect((await owner.post("/inventory/forecast", { inventory_item_ids: ["not-a-uuid"] })).status).toBe(400);
  });
});

describe("GET /suppliers", () => {
  it("marks only mandate-approved suppliers as approved", async () => {
    const res = await viewer.get("/suppliers");
    expect(res.status).toBe(200);
    const suppliers = res.body.items as SupplierDto[];
    expect(suppliers).toHaveLength(4);
    const approved = (await owner.get("/mandates/current")).body.mandate.approved_supplier_ids as string[];
    for (const s of suppliers) expect(s.approved).toBe(approved.includes(s.id));
    expect(suppliers.find((s) => s.name.startsWith("PackRight"))!.approved).toBe(false);
  });

  it("reports no supplier as approved while there is no active mandate", async () => {
    const orgId = (await owner.get("/auth/me")).body.user.organization.id as string;
    const active = and(eq(spendMandates.organizationId, orgId), eq(spendMandates.status, "ACTIVE"));
    const [mandate] = await h.ctx.db.select().from(spendMandates).where(active);
    await h.ctx.db.update(spendMandates).set({ status: "SUPERSEDED" }).where(eq(spendMandates.id, mandate!.id));
    try {
      const suppliers = (await viewer.get("/suppliers")).body.items as SupplierDto[];
      expect(suppliers.length).toBeGreaterThan(0);
      expect(suppliers.every((s) => !s.approved)).toBe(true);
      expect((await viewer.get("/mandates/current")).status).toBe(404);
    } finally {
      await h.ctx.db.update(spendMandates).set({ status: "ACTIVE" }).where(eq(spendMandates.id, mandate!.id));
    }
  });
});

describe("adjustment compare-and-set", () => {
  it("applies a count only if stock has not moved since the user looked", async () => {
    const owner = await h.agent("owner");
    const item = (await owner.get("/inventory")).body.items[0] as { id: string; on_hand: number };
    const ok = await owner.post(`/inventory/${item.id}/adjustments`, {
      quantity_delta: 2,
      reason: "COUNT_CORRECTION",
      expected_on_hand: item.on_hand,
    });
    expect(ok.status).toBe(200);
    // A second count made against the old figure is refused with the current quantity.
    const stale = await owner.post(`/inventory/${item.id}/adjustments`, {
      quantity_delta: 1,
      reason: "COUNT_CORRECTION",
      expected_on_hand: item.on_hand,
    });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: "STOCK_CHANGED", details: { on_hand: item.on_hand + 2 } });
  });
});
