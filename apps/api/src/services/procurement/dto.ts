import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type {
  AgentStepDto,
  CandidateDto,
  DataSource,
  InterpretedIntentDto,
  MarketReferenceDto,
  Page,
  ProcurementRequestDto,
  ProcurementRequestSummaryDto,
  RecommendationDto,
} from "@qm/contracts";
import {
  agentRuns,
  forecastRuns,
  purchaseCandidates,
  purchaseOrders,
  purchaseRequests,
  securityFindings,
  supplierCatalogItems,
  suppliers,
  toolExecutions,
  type DbOrTx,
} from "@qm/database";
import { notFound } from "../../errors";
import { toFindingDto } from "../findings";
import { toForecastDto } from "../inventory";
import { orderDtos } from "../orders";
import { afterCursor, decodeCursor, newestFirst, toPage } from "../pagination";

export async function getRequestDto(db: DbOrTx, organizationId: string, id: string): Promise<ProcurementRequestDto> {
  const [req] = await db.select().from(purchaseRequests).where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.organizationId, organizationId)));
  if (!req) throw notFound("Procurement request");

  const [forecast] = req.forecastRunId ? await db.select().from(forecastRuns).where(eq(forecastRuns.id, req.forecastRunId)) : [];
  const candidates = await db.select().from(purchaseCandidates).where(eq(purchaseCandidates.requestId, req.id)).orderBy(asc(purchaseCandidates.inventoryItemId), asc(purchaseCandidates.rank));
  const sups = await db.select().from(suppliers).where(eq(suppliers.organizationId, organizationId));
  const catalogIds = [...new Set(candidates.map((c) => c.catalogItemId))];
  const catalog = catalogIds.length ? await db.select().from(supplierCatalogItems).where(inArray(supplierCatalogItems.id, catalogIds)) : [];
  const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.requestId, req.id)).orderBy(asc(purchaseOrders.createdAt));
  const findings = await db.select().from(securityFindings).where(eq(securityFindings.relatedRequestId, req.id)).orderBy(desc(securityFindings.createdAt));
  const runs = await db.select({ id: agentRuns.id }).from(agentRuns).where(eq(agentRuns.requestId, req.id));
  const steps = runs.length
    ? await db.select().from(toolExecutions).where(inArray(toolExecutions.agentRunId, runs.map((r) => r.id))).orderBy(asc(toolExecutions.startedAt))
    : [];

  const supplierById = new Map(sups.map((s) => [s.id, s]));
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const proposals = await orderDtos(db, organizationId, pos);

  const candidateDtos: CandidateDto[] = candidates.map((c) => {
    const s = supplierById.get(c.supplierId);
    const item = catalogById.get(c.catalogItemId);
    const quote = c.quote as { subtotal_minor: number; shipping_minor: number; tax_minor: number; fees_minor: number; total_minor: number; supplier_approved?: boolean };
    return {
      id: c.id,
      inventory_item_id: c.inventoryItemId,
      supplier_id: c.supplierId,
      supplier_name: s?.name ?? "Unknown",
      supplier_approved: quote.supplier_approved === true,
      checkout_eligible: s?.checkoutEligible ?? false,
      catalog_item_id: c.catalogItemId,
      sku: item?.sku ?? "",
      title: item?.title ?? "",
      pack_quantity: item?.packQuantity ?? 0,
      packs: c.packs,
      units: c.units,
      item_subtotal_minor: quote.subtotal_minor,
      shipping_minor: quote.shipping_minor,
      tax_minor: quote.tax_minor,
      fees_minor: quote.fees_minor,
      delivered_total_minor: quote.total_minor,
      delivered_unit_cost_minor: Math.round(c.deliveredUnitCostMinor * 100) / 100,
      lead_time_days: s?.leadTimeDays ?? 0,
      rank: c.rank,
      eligible: c.eligible,
      ineligible_reasons: c.ineligibleReasons,
      quarantined: c.quarantined,
      data_source: (s?.dataSource as DataSource) ?? "SANDBOX_SUPPLIER",
    };
  });

  const steps2: AgentStepDto[] = steps.map((t) => ({
    id: t.id,
    tool: t.tool,
    status: t.status,
    duration_ms: t.durationMs,
    summary: t.error ? `${t.summary} — ${t.error}` : t.summary,
    started_at: t.startedAt.toISOString(),
  }));

  const live = proposals.filter((p) => p.status !== "SUPERSEDED");
  return {
    id: req.id,
    status: req.status,
    instruction: req.instruction,
    currency: req.currency,
    budget_limit_minor: req.budgetLimitMinor,
    required_by: req.requiredBy,
    allow_alternatives: req.allowAlternatives,
    intent: (req.intent as InterpretedIntentDto | null) ?? null,
    forecast: forecast ? toForecastDto(forecast) : null,
    market: (req.market as MarketReferenceDto[]) ?? [],
    candidates: candidateDtos,
    proposals,
    active_proposal_id: live.find((p) => ["PROPOSED", "APPROVED", "PAYMENT_PENDING"].includes(p.status))?.id ?? null,
    recommendation: (req.recommendation as RecommendationDto | null) ?? null,
    security_findings: findings.map(toFindingDto),
    agent_steps: steps2,
    created_by: req.createdBy,
    created_at: req.createdAt.toISOString(),
    updated_at: req.updatedAt.toISOString(),
  };
}

export async function listRequests(db: DbOrTx, organizationId: string, limit: number, cursor?: string): Promise<Page<ProcurementRequestSummaryDto>> {
  const rows = await db
    .select()
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.organizationId, organizationId), afterCursor(purchaseRequests.createdAt, purchaseRequests.id, decodeCursor(cursor))))
    .orderBy(...newestFirst(purchaseRequests.createdAt, purchaseRequests.id))
    .limit(limit + 1);
  const { page, nextCursor } = toPage(rows, limit);
  const totals = page.length
    ? await db
        .select({ requestId: purchaseOrders.requestId, total: purchaseOrders.totalMinor, status: purchaseOrders.status })
        .from(purchaseOrders)
        .where(inArray(purchaseOrders.requestId, page.map((r) => r.id)))
    : [];
  return {
    items: page.map((r) => {
      const t = totals.filter((x) => x.requestId === r.id && !["SUPERSEDED", "BLOCKED", "REJECTED"].includes(x.status));
      return {
        id: r.id,
        status: r.status,
        instruction: r.instruction,
        total_minor: t.length ? t.reduce((a, x) => a + x.total, 0) : null,
        currency: r.currency,
        created_at: r.createdAt.toISOString(),
      };
    }),
    next_cursor: nextCursor,
  };
}
