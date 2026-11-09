import { Router } from "express";
import { and, desc, eq, lt } from "drizzle-orm";
import {
  AnalyzeInvoiceRequest,
  DelayDeliveryRequest,
  PaginationQuery,
  ReceiveDeliveryRequest,
  SecurityEventsQuery,
  SpendMandateInput,
} from "@qm/contracts";
import { auditEvents, organizations, policyDecisions, purchaseOrders, securityFindings } from "@qm/database";
import type { AppContext } from "../../context";
import { forbidden } from "../../errors";
import { analyticsSummary } from "../../services/analytics";
import { verifyAuditChain } from "../../services/audit";
import { currentAccount, toBudgetDto } from "../../services/budget";
import { toFindingDto } from "../../services/findings";
import { delayDelivery, listDeliveries, receiveDelivery } from "../../services/fulfillment";
import { analyzeAndRecordInvoice, listInvoices } from "../../services/invoices";
import { getActiveMandateRow, toMandateDto, updateMandate } from "../../services/mandates";
import { loadOrder, orderDtos, toDecisionDto } from "../../services/orders";
import { actorOf, requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";
import { idempotent } from "../middleware/idempotency";
import { notFound } from "../../errors";

function cursorDate(cursor: string | undefined): Date | null {
  if (!cursor) return null;
  const d = new Date(cursor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function operationsRoutes(ctx: AppContext): Router {
  const r = Router();

  /* ------------------------------------------------------------- Mandate */
  const budgetFor = async (orgId: string, weekly: number) => {
    const [org] = await ctx.db.select().from(organizations).where(eq(organizations.id, orgId));
    return toBudgetDto(await currentAccount(ctx.db, { organizationId: orgId, timeZone: org!.timezone, currency: org!.currency, weeklyLimitMinor: weekly, now: ctx.now(), lock: false }));
  };

  r.get(
    "/mandates/current",
    asyncHandler(async (req, res) => {
      const row = await getActiveMandateRow(ctx.db, req.user!.organizationId);
      if (!row) throw notFound("Active Spend Mandate");
      res.json({ mandate: toMandateDto(row), budget: await budgetFor(req.user!.organizationId, row.weeklyBudgetMinor) });
    }),
  );

  r.put(
    "/mandates/current",
    requireRole("OWNER"),
    idempotent(ctx, "mandates.update", async (req) => {
      const input = parse(SpendMandateInput, req.body);
      const out = await ctx.db.transaction((tx) => updateMandate(tx, { organizationId: req.user!.organizationId, userId: req.user!.id, input, now: ctx.now() }));
      return {
        status: 200,
        body: { mandate: toMandateDto(out.mandate), budget: await budgetFor(req.user!.organizationId, out.mandate.weeklyBudgetMinor), revoked_certificates: out.revokedCertificates },
      };
    }),
  );

  /* ------------------------------------------------------ Purchase orders */
  r.get(
    "/purchase-orders",
    asyncHandler(async (req, res) => {
      const q = parse(PaginationQuery, req.query);
      const before = cursorDate(q.cursor);
      const orgId = req.user!.organizationId;
      const rows = await ctx.db
        .select()
        .from(purchaseOrders)
        .where(before ? and(eq(purchaseOrders.organizationId, orgId), lt(purchaseOrders.createdAt, before)) : eq(purchaseOrders.organizationId, orgId))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(q.limit + 1);
      const page = rows.slice(0, q.limit);
      res.json({ items: await orderDtos(ctx.db, orgId, page), next_cursor: rows.length > q.limit ? page[page.length - 1]!.createdAt.toISOString() : null });
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
      const q = parse(SecurityEventsQuery, req.query);
      const before = cursorDate(q.cursor);
      const orgId = req.user!.organizationId;
      const conds = [eq(securityFindings.organizationId, orgId)];
      if (before) conds.push(lt(securityFindings.createdAt, before));
      if (q.severity) conds.push(eq(securityFindings.severity, q.severity));
      if (q.type) conds.push(eq(securityFindings.type, q.type));
      const rows = await ctx.db.select().from(securityFindings).where(and(...conds)).orderBy(desc(securityFindings.createdAt)).limit(q.limit + 1);
      const page = rows.slice(0, q.limit);
      res.json({ items: page.map(toFindingDto), next_cursor: rows.length > q.limit ? page[page.length - 1]!.createdAt.toISOString() : null });
    }),
  );

  r.get(
    "/security/decisions",
    asyncHandler(async (req, res) => {
      const q = parse(PaginationQuery, req.query);
      const before = cursorDate(q.cursor);
      const orgId = req.user!.organizationId;
      const rows = await ctx.db
        .select()
        .from(policyDecisions)
        .where(before ? and(eq(policyDecisions.organizationId, orgId), lt(policyDecisions.createdAt, before)) : eq(policyDecisions.organizationId, orgId))
        .orderBy(desc(policyDecisions.createdAt))
        .limit(q.limit + 1);
      const page = rows.slice(0, q.limit);
      res.json({ items: page.map(toDecisionDto), next_cursor: rows.length > q.limit ? page[page.length - 1]!.createdAt.toISOString() : null });
    }),
  );

  r.get(
    "/security/audit",
    asyncHandler(async (req, res) => {
      const q = parse(PaginationQuery, req.query);
      const orgId = req.user!.organizationId;
      const beforeSeq = q.cursor && /^\d+$/.test(q.cursor) ? Number(q.cursor) : null;
      const rows = await ctx.db
        .select()
        .from(auditEvents)
        .where(beforeSeq ? and(eq(auditEvents.organizationId, orgId), lt(auditEvents.sequence, beforeSeq)) : eq(auditEvents.organizationId, orgId))
        .orderBy(desc(auditEvents.sequence))
        .limit(q.limit + 1);
      const page = rows.slice(0, q.limit);
      res.json({
        items: page.map((e) => ({
          id: e.id,
          sequence: e.sequence,
          action: e.action,
          actor_type: e.actorType,
          actor_id: e.actorId,
          entity_type: e.entityType,
          entity_id: e.entityId,
          data: e.data,
          hash: e.hash,
          prev_hash: e.prevHash,
          correlation_id: e.correlationId,
          created_at: e.createdAt.toISOString(),
        })),
        next_cursor: rows.length > q.limit ? String(page[page.length - 1]!.sequence) : null,
      });
    }),
  );

  r.get(
    "/security/audit/verify",
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
