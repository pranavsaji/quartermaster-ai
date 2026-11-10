import { Router } from "express";
import { CreateInventoryItemRequest, ForecastRequest, InventoryAdjustmentRequest, InventoryItemInput } from "@qm/contracts";
import type { AppContext } from "../../context";
import { adjustInventory, createInventoryItem, listInventory, runForecast, updateInventoryItem } from "../../services/inventory";
import { requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";
import { idempotent } from "../middleware/idempotency";

export function inventoryRoutes(ctx: AppContext): Router {
  const r = Router();

  r.get(
    "/inventory",
    asyncHandler(async (req, res) => {
      res.json({ items: await listInventory(ctx.db, req.user!.organizationId, ctx.now()) });
    }),
  );

  r.post(
    "/inventory",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(CreateInventoryItemRequest, req.body);
      const item = await ctx.db.transaction((tx) =>
        createInventoryItem(tx, { organizationId: req.user!.organizationId, userId: req.user!.id, input, now: ctx.now() }),
      );
      res.status(201).json({ item });
    }),
  );

  r.put(
    "/inventory/:id",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(InventoryItemInput, req.body);
      const item = await ctx.db.transaction((tx) =>
        updateInventoryItem(tx, {
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          itemId: param(req, "id"),
          input,
          now: ctx.now(),
        }),
      );
      res.json({ item });
    }),
  );

  r.post(
    "/inventory/:id/adjustments",
    requireRole("MANAGER"),
    idempotent(ctx, "inventory.adjust", async (req) => {
      const input = parse(InventoryAdjustmentRequest, req.body);
      const item = await ctx.db.transaction((tx) =>
        adjustInventory(tx, {
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          itemId: param(req, "id"),
          input,
          now: ctx.now(),
        }),
      );
      return { status: 200, body: { item } };
    }),
  );

  r.post(
    "/inventory/forecast",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(ForecastRequest, req.body ?? {});
      const { run } = await runForecast(ctx.db, {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        demandMultiplier: input.demand_multiplier,
        itemIds: input.inventory_item_ids,
        now: ctx.now(),
      });
      res.json(run);
    }),
  );

  return r;
}
