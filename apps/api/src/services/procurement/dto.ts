import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
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

const minor = z.number().int().refine(Number.isSafeInteger, "not a safe integer");

/** A candidate's stored quote: the integer amounts shown to the owner. */
const CandidateQuote = z.object({
  subtotal_minor: minor,
  shipping_minor: minor,
  tax_minor: minor,
  fees_minor: minor,
  total_minor: minor,
  supplier_approved: z.boolean().optional(),
});

export async function getRequestDto(db: DbOrTx, organizationId: string, id: string): Promise<ProcurementRequestDto> {
  const [req] = await db
    .select()
    .from(purchaseRequests)
    .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.organizationId, organizationId)));
  if (!req) throw notFound("Procurement request");

  // Independent reads run concurrently; the catalog depends on the candidates and the proposals
  // on the purchase orders, so each of those is chained after its source.
  const [[forecast], { candidates, catalog }, sups, proposals, findings, steps] = await Promise.all([
    req.forecastRunId ? db.select().from(forecastRuns).where(eq(forecastRuns.id, req.forecastRunId)) : Promise.resolve([]),
    (async () => {
      const candidates = await db
        .select()
        .from(purchaseCandidates)
        .where(eq(purchaseCandidates.requestId, req.id))
        .orderBy(asc(purchaseCandidates.inventoryItemId), asc(purchaseCandidates.rank));
      const catalogIds = [...new Set(candidates.map((c) => c.catalogItemId))];
      const catalog = catalogIds.length
        ? await db.select().from(supplierCatalogItems).where(inArray(supplierCatalogItems.id, catalogIds))
        : [];
      return { candidates, catalog };
    })(),
    db.select().from(suppliers).where(eq(suppliers.organizationId, organizationId)),
    (async () => {
      const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.requestId, req.id)).orderBy(asc(purchaseOrders.createdAt));
      return orderDtos(db, organizationId, pos);
    })(),
    db.select().from(securityFindings).where(eq(securityFindings.relatedRequestId, req.id)).orderBy(desc(securityFindings.createdAt)),
    // Steps of every run for this request, in one joined query.
    db
      .select({ step: toolExecutions })
      .from(toolExecutions)
      .innerJoin(agentRuns, eq(agentRuns.id, toolExecutions.agentRunId))
      .where(eq(agentRuns.requestId, req.id))
      .orderBy(asc(toolExecutions.startedAt))
      .then((rows) => rows.map((r) => r.step)),
  ]);

  const supplierById = new Map(sups.map((s) => [s.id, s]));
  const catalogById = new Map(catalog.map((c) => [c.id, c]));

  // Candidates are review evidence only (never charged or signed): one whose stored quote is
  // malformed is left out of the comparison rather than shown with made-up amounts.
  const candidateDtos: CandidateDto[] = candidates.flatMap((c) => {
    const parsed = CandidateQuote.safeParse(c.quote);
    if (!parsed.success) return [];
    const quote = parsed.data;
    const s = supplierById.get(c.supplierId);
    const item = catalogById.get(c.catalogItemId);
    const dto: CandidateDto = {
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
    return [dto];
  });

  const steps2: AgentStepDto[] = steps.map((t) => ({
    id: t.id,
    tool: t.tool,
    status: t.status,
    duration_ms: t.durationMs,
    // Authored text only. `error` is an internal diagnostic (possibly provider text) and is
    // deliberately never returned: every member of the organization, viewers included, sees steps.
    summary: t.summary,
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

export async function listRequests(
  db: DbOrTx,
  organizationId: string,
  limit: number,
  cursor?: string,
): Promise<Page<ProcurementRequestSummaryDto>> {
  const rows = await db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.organizationId, organizationId),
        afterCursor(purchaseRequests.createdAt, purchaseRequests.id, decodeCursor(cursor)),
      ),
    )
    .orderBy(...newestFirst(purchaseRequests.createdAt, purchaseRequests.id))
    .limit(limit + 1);
  const { page, nextCursor } = toPage(rows, limit);
  const totals = page.length
    ? await db
        .select({ requestId: purchaseOrders.requestId, total: purchaseOrders.totalMinor, status: purchaseOrders.status })
        .from(purchaseOrders)
        .where(
          inArray(
            purchaseOrders.requestId,
            page.map((r) => r.id),
          ),
        )
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
