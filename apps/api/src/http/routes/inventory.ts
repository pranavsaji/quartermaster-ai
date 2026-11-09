import { Router } from "express";
import { ForecastRequest, InventoryAdjustmentRequest } from "@qm/contracts";
import type { AppContext } from "../../context";
import { adjustInventory, listInventory, runForecast } from "../../services/inventory";
import { getActiveMandateRow, rowToMandate } from "../../services/mandates";
import { loadSuppliers, toSupplierDto } from "../../services/suppliers";
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

  r.get(
    "/suppliers",
    asyncHandler(async (req, res) => {
      const orgId = req.user!.organizationId;
      const mandateRow = await getActiveMandateRow(ctx.db, orgId);
      const mandate = mandateRow ? rowToMandate(mandateRow) : null;
      res.json({ items: (await loadSuppliers(ctx.db, orgId)).map((s) => toSupplierDto(s, mandate)) });
    }),
  );

  return r;
}
