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
import { refuseInSampleWorkspace, requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";

/** Suppliers and their catalogs. Managers maintain them; only owners approve suppliers (Spend Mandate). */
export function supplierRoutes(ctx: AppContext): Router {
  const r = Router();
  // Supplier terms, catalog prices and supplier approval feed TrustRail: fixed in the shared sample.
  const sample = refuseInSampleWorkspace(ctx);
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
    sample,
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
    sample,
    asyncHandler(async (req, res) => {
      const input = parse(SupplierInput, req.body);
      const orgId = req.user!.organizationId;
      const id = param(req, "id");
      await ctx.db.transaction(async (tx) => {
        // Locks the active mandate, which updateMandate also locks: an approval and a terms edit
        // are serialised, so an edit cannot slip past an approval made at the same moment.
        // If an approval superseded the row while we waited, the first read finds no ACTIVE row
        // (READ COMMITTED re-checks the condition); the second sees the new version.
        const row = (await getActiveMandateRow(tx, orgId, true)) ?? (await getActiveMandateRow(tx, orgId, true));
        const actor = { id: req.user!.id, organizationId: orgId, role: req.user!.role };
        await updateSupplier(tx, actor, id, input, row ? rowToMandate(row) : null);
      });
      res.json({ supplier: await supplierDetail(ctx.db, orgId, id, await mandateOf(orgId)) });
    }),
  );

  r.post(
    "/suppliers/:id/catalog",
    requireRole("MANAGER"),
    sample,
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
    sample,
    asyncHandler(async (req, res) => {
      const input = parse(CatalogItemInput, req.body);
      const actor = { id: req.user!.id, organizationId: req.user!.organizationId };
      const row = await ctx.db.transaction((tx) => updateCatalogItem(tx, actor, param(req, "id"), param(req, "itemId"), input, ctx.now()));
      res.json({ item: toCatalogDto(row) });
    }),
  );

  return r;
}
