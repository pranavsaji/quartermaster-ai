import { Router } from "express";
import {
  AnalyzeInvoiceRequest,
  DelayDeliveryRequest,
  PaginationQuery,
  PurchaseOrdersQuery,
  ReceiveDeliveryRequest,
  SecurityEventsQuery,
  SpendMandateInput,
} from "@qm/contracts";
import type { AppContext } from "../../context";
import { forbidden, notFound } from "../../errors";
import { analyticsSummary } from "../../services/analytics";
import { verifyAuditChain } from "../../services/audit";
import { weeklyBudget } from "../../services/budget";
import { delayDelivery, listDeliveries, receiveDelivery } from "../../services/fulfillment";
import { analyzeAndRecordInvoice, listInvoices } from "../../services/invoices";
import { getActiveMandateRow, toMandateDto, updateMandate } from "../../services/mandates";
import { listOrders, loadOrder, orderDtos } from "../../services/orders";
import { listAuditEvents, listDecisions, listFindings } from "../../services/security";
import { actorOf, requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";
import { idempotent } from "../middleware/idempotency";

export function operationsRoutes(ctx: AppContext): Router {
  const r = Router();

  /* ------------------------------------------------------------- Mandate */
  r.get(
    "/mandates/current",
    asyncHandler(async (req, res) => {
      const row = await getActiveMandateRow(ctx.db, req.user!.organizationId);
      if (!row) throw notFound("Active Spend Mandate");
      res.json({ mandate: toMandateDto(row), budget: await weeklyBudget(ctx, req.user!.organizationId, row.weeklyBudgetMinor) });
    }),
  );

  r.put(
    "/mandates/current",
    requireRole("OWNER"),
    idempotent(ctx, "mandates.update", async (req) => {
      const input = parse(SpendMandateInput, req.body);
      const out = await ctx.db.transaction((tx) =>
        updateMandate(tx, { organizationId: req.user!.organizationId, userId: req.user!.id, input, now: ctx.now() }),
      );
      return {
        status: 200,
        body: {
          mandate: toMandateDto(out.mandate),
          budget: await weeklyBudget(ctx, req.user!.organizationId, out.mandate.weeklyBudgetMinor),
          revoked_certificates: out.revokedCertificates,
        },
      };
    }),
  );

  /* ------------------------------------------------------ Purchase orders */
  r.get(
    "/purchase-orders",
    asyncHandler(async (req, res) => {
      res.json(await listOrders(ctx.db, req.user!.organizationId, parse(PurchaseOrdersQuery, req.query)));
    }),
  );

  r.get(
    "/purchase-orders/:id",
    asyncHandler(async (req, res) => {
      const { po } = await loadOrder(ctx.db, req.user!.organizationId, param(req, "id"));
      const [dto] = await orderDtos(ctx.db, req.user!.organizationId, [po]);
      res.json(dto);
    }),
  );

  /* ----------------------------------------------------------- Deliveries */
  r.get(
    "/deliveries",
    asyncHandler(async (req, res) => {
      res.json({ items: await listDeliveries(ctx.db, req.user!.organizationId) });
    }),
  );

  r.post(
    "/deliveries/:id/receive",
    requireRole("MANAGER"),
    idempotent(ctx, "deliveries.receive", async (req) => {
      if (!ctx.config.allowSyntheticDeliveryActions) throw forbidden("Synthetic delivery actions are disabled.");
      const input = parse(ReceiveDeliveryRequest, req.body);
      return { status: 200, body: { delivery: await receiveDelivery(ctx, actorOf(req), param(req, "id"), input) } };
    }),
  );

  r.post(
    "/deliveries/:id/delay",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      if (!ctx.config.allowSyntheticDeliveryActions) throw forbidden("Synthetic delivery actions are disabled.");
      const input = parse(DelayDeliveryRequest, req.body);
      res.json({ delivery: await delayDelivery(ctx, actorOf(req), param(req, "id"), input) });
    }),
  );

  /* ------------------------------------------------------------- Invoices */
  r.get(
    "/invoices",
    asyncHandler(async (req, res) => {
      res.json({ items: await listInvoices(ctx.db, req.user!.organizationId) });
    }),
  );

  r.post(
    "/invoices/analyze",
    requireRole("MANAGER"),
    idempotent(ctx, "invoices.analyze", async (req) => {
      const input = parse(AnalyzeInvoiceRequest, req.body);
      return { status: 200, body: await analyzeAndRecordInvoice(ctx, actorOf(req), input) };
    }),
  );

  /* ------------------------------------------------------------- Security */
  r.get(
    "/security/events",
    asyncHandler(async (req, res) => {
      res.json(await listFindings(ctx.db, req.user!.organizationId, parse(SecurityEventsQuery, req.query)));
    }),
  );

  r.get(
    "/security/decisions",
    asyncHandler(async (req, res) => {
      res.json(await listDecisions(ctx.db, req.user!.organizationId, parse(PaginationQuery, req.query)));
    }),
  );

  r.get(
    "/security/audit",
    asyncHandler(async (req, res) => {
      res.json(await listAuditEvents(ctx.db, req.user!.organizationId, parse(PaginationQuery, req.query)));
    }),
  );

  r.get(
    "/security/audit/verify",
    // Recomputes the whole chain: limited to managers and owners so viewers cannot trigger it at will.
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      res.json(await verifyAuditChain(ctx.db, req.user!.organizationId));
    }),
  );

  /* ------------------------------------------------------------ Analytics */
  r.get(
    "/analytics/summary",
    asyncHandler(async (req, res) => {
      res.json(await analyticsSummary(ctx, req.user!.organizationId));
    }),
  );

  return r;
}
