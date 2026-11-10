import { Router } from "express";
import { CatalogItemInput, SupplierInput } from "@qm/contracts";
import type { AppContext } from "../../context";
import { getActiveMandateRow, rowToMandate } from "../../services/mandates";
import {
  catalogCounts,
  createCatalogItem,
  createSupplier,
  loadSuppliers,
  supplierDetail,
  toCatalogDto,
  toSupplierDto,
  updateCatalogItem,
  updateSupplier,
} from "../../services/suppliers";
import { requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";

/** Suppliers and their catalogs. Managers maintain them; only owners approve suppliers (Spend Mandate). */
export function supplierRoutes(ctx: AppContext): Router {
  const r = Router();
  const mandateOf = async (orgId: string) => {
    const row = await getActiveMandateRow(ctx.db, orgId);
    return row ? rowToMandate(row) : null;
  };

  r.get(
    "/suppliers",
    asyncHandler(async (req, res) => {
      const orgId = req.user!.organizationId;
      const [mandate, rows, counts] = await Promise.all([mandateOf(orgId), loadSuppliers(ctx.db, orgId), catalogCounts(ctx.db, orgId)]);
      res.json({ items: rows.map((s) => toSupplierDto(s, mandate, counts.get(s.id) ?? 0)) });
    }),
  );

  r.get(
    "/suppliers/:id",
    asyncHandler(async (req, res) => {
      const orgId = req.user!.organizationId;
      res.json({ supplier: await supplierDetail(ctx.db, orgId, param(req, "id"), await mandateOf(orgId)) });
    }),
  );

  r.post(
    "/suppliers",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(SupplierInput, req.body);
      const orgId = req.user!.organizationId;
      const row = await ctx.db.transaction((tx) => createSupplier(tx, { id: req.user!.id, organizationId: orgId }, input));
      res.status(201).json({ supplier: await supplierDetail(ctx.db, orgId, row.id, await mandateOf(orgId)) });
    }),
  );

  r.put(
    "/suppliers/:id",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(SupplierInput, req.body);
      const orgId = req.user!.organizationId;
      const id = param(req, "id");
      const mandate = await mandateOf(orgId);
      await ctx.db.transaction((tx) =>
        updateSupplier(tx, { id: req.user!.id, organizationId: orgId, role: req.user!.role }, id, input, mandate),
      );
      res.json({ supplier: await supplierDetail(ctx.db, orgId, id, await mandateOf(orgId)) });
    }),
  );

  r.post(
    "/suppliers/:id/catalog",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(CatalogItemInput, req.body);
      const actor = { id: req.user!.id, organizationId: req.user!.organizationId };
      const row = await ctx.db.transaction((tx) => createCatalogItem(tx, actor, param(req, "id"), input));
      res.status(201).json({ item: toCatalogDto(row) });
    }),
  );

  r.put(
    "/suppliers/:id/catalog/:itemId",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      const input = parse(CatalogItemInput, req.body);
      const actor = { id: req.user!.id, organizationId: req.user!.organizationId };
      const row = await ctx.db.transaction((tx) => updateCatalogItem(tx, actor, param(req, "id"), param(req, "itemId"), input, ctx.now()));
      res.json({ item: toCatalogDto(row) });
    }),
  );

  return r;
}
