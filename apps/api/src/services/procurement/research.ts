import { and, eq, inArray } from "drizzle-orm";
import { COMMITTED_PO_STATUSES, type MarketReferenceDto } from "@qm/contracts";
import { purchaseCandidates, purchaseOrders, purchaseRequests, supplierCatalogItems } from "@qm/database";
import {
  buildSupplierQuote,
  compareOffers,
  planCarts,
  type CandidateEvaluation,
  type ForecastLine,
  type PlannedCart,
  type StorefrontQuoteLine,
} from "@qm/quartermaster";
import { detectPromptInjection, mergeVerdicts, type SpendMandate } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { AppError, conflict, notFound, unprocessable } from "../../errors";
import { appendAudit } from "../audit";
import { recordFinding } from "../findings";
import { runForecast, type InventoryRow } from "../inventory";
import { getActiveMandateRow, rowToMandate } from "../mandates";
import { researchItem } from "../market";
import { createProposal, loadOrder } from "../orders";
import { evaluateOrder, parseStoredIntent, type StoredIntent } from "../policy";
import {
  loadCatalogForItems,
  loadSuppliers,
  storefrontLines,
  toOffer,
  toSupplierProfile,
  type CatalogRow,
  type SupplierRow,
} from "../suppliers";
import { AgentBudgetExceeded, AgentRun } from "../agent/runtime";
import { classifyInjection, deterministicExplanation, explainRecommendation, type ExplanationFacts } from "../agent/llm";
import { getRequestDto } from "./dto";
import { refreshRequestStatus } from "./status";

const MAX_PLAN_ATTEMPTS = 3;
const RESEARCHABLE = ["DRAFT", "READY_FOR_REVIEW", "BLOCKED", "FAILED"];

type RequestRow = typeof purchaseRequests.$inferSelect;
type Candidate = CandidateEvaluation & { id: string };

/** Everything every research stage needs: who, which request, and the run's envelope. */
interface ResearchContext {
  ctx: AppContext;
  run: AgentRun;
  orgId: string;
  userId: string;
  requestId: string;
  request: RequestRow;
  intent: StoredIntent;
  /** The research's reference time (forecast, market freshness, comparison). */
  now: Date;
  /** Every proposal this run created, so a failed run can withdraw them (see failResearch). */
  createdProposalIds: string[];
}

/** Output of the forecast stage. */
interface Demand {
  multiplier: number;
  lines: ForecastLine[];
  /** Lines at or below their reorder point with something to buy. */
  needed: ForecastLine[];
  itemRows: Map<string, InventoryRow>;
}

/** The supply side: active mandate, suppliers and the (re-scanned) catalog for the needed items. */
interface Sourcing {
  mandate: SpendMandate | null;
  supplierRows: SupplierRow[];
  supplierById: Map<string, SupplierRow>;
  catalog: CatalogRow[];
}

interface AcceptedCart {
  planned: PlannedCart;
  poId: string;
  decision: string;
  violations: string[];
}

interface PlanOutcome {
  accepted: AcceptedCart[];
  blocked: ExplanationFacts["blocked"];
}

/**
 * The bounded research workflow:
 *   forecast → market research → threat scan → supplier comparison → planning → TrustRail
 *   evaluation (with re-planning around blocked suppliers) → explanation.
 * The agent proposes; it never approves or pays.
 */
export async function researchRequest(ctx: AppContext, user: { id: string; organizationId: string }, requestId: string) {
  const now = ctx.now();
  const orgId = user.organizationId;
  const claimed = await claimRequest(ctx, orgId, requestId, now);

  let run: AgentRun | null = null;
  const createdProposalIds: string[] = [];
  try {
    run = await AgentRun.start(ctx.db, {
      organizationId: orgId,
      requestId,
      kind: "RESEARCH",
      log: ctx.log,
      limits: {
        maxToolCalls: 60,
        maxResearchCalls: ctx.config.agent.maxResearchCalls,
        deadlineMs: ctx.config.agent.deadlineMs,
        tokenBudget: ctx.config.agent.tokenBudget,
      },
    });
    run.aiMode = ctx.openai.enabled ? "LLM" : "DETERMINISTIC_FALLBACK";
    // The intent carries the owner's cap: research never runs on one it cannot read.
    const intent = parseStoredIntent(claimed.intent);
    if (!intent) throw unprocessable("REQUEST_INTENT_INVALID", "The request's stored intent is malformed. Create a new request.");
    return await runResearch({
      ctx,
      run,
      orgId,
      userId: user.id,
      requestId,
      request: claimed,
      intent,
      now,
      createdProposalIds,
    });
  } catch (err) {
    await failResearch(ctx, requestId, run, createdProposalIds, err);
    throw err;
  }
}

/**
 * Research is all-or-nothing for the owner. A failed run withdraws the proposals it created
 * (they become SUPERSEDED evidence, never approvable orders under a FAILED request) and marks
 * the request FAILED with client-safe text; an AppError's message (e.g. the agent deadline) is
 * authored for clients, anything else stays in the logs. The request is still RESEARCHING while
 * its proposals are withdrawn, so approval (which refuses RESEARCHING) cannot interleave.
 */
async function failResearch(ctx: AppContext, requestId: string, run: AgentRun | null, createdProposalIds: string[], err: unknown) {
  ctx.log.error({ err, request_id: requestId }, "research failed");
  const message = err instanceof AppError ? err.message : "Research failed unexpectedly. Try again.";
  if (createdProposalIds.length) {
    await ctx.db
      .update(purchaseOrders)
      .set({ status: "SUPERSEDED", updatedAt: ctx.now() })
      .where(and(inArray(purchaseOrders.id, createdProposalIds), inArray(purchaseOrders.status, ["PROPOSED", "BLOCKED"])));
  }
  await ctx.db
    .update(purchaseRequests)
    .set({ status: "FAILED", error: message.slice(0, 500), updatedAt: ctx.now() })
    .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.status, "RESEARCHING")));
  await run
    ?.finish("FAILED", message)
    .catch((e: unknown) => ctx.log.warn({ err: e, request_id: requestId }, "could not close the agent run"));
}

/**
 * Claims the request under its row lock. Approval takes the same lock and refuses while a
 * request is RESEARCHING, so research and approval can never interleave: either research sees
 * the approved order (and refuses), or approval waits for research to finish.
 */
async function claimRequest(ctx: AppContext, orgId: string, requestId: string, now: Date): Promise<RequestRow> {
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(purchaseRequests)
      .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, orgId)))
      .for("update");
    if (!row) throw notFound("Procurement request");
    if (!RESEARCHABLE.includes(row.status)) {
      throw conflict("REQUEST_NOT_RESEARCHABLE", `Request is ${row.status}; research can only run before approval.`);
    }
    const committed = await tx
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.requestId, requestId), inArray(purchaseOrders.status, [...COMMITTED_PO_STATUSES])));
    if (committed.length > 0) throw conflict("REQUEST_HAS_APPROVED_ORDERS", "Research cannot be re-run after an order has been approved.");

    // Previous proposals become superseded evidence; candidates are recomputed.
    await tx
      .update(purchaseOrders)
      .set({ status: "SUPERSEDED", updatedAt: now })
      .where(and(eq(purchaseOrders.requestId, requestId), inArray(purchaseOrders.status, ["PROPOSED", "BLOCKED"])));
    await tx.delete(purchaseCandidates).where(eq(purchaseCandidates.requestId, requestId));
    const [updated] = await tx
      .update(purchaseRequests)
      .set({ status: "RESEARCHING", researchStartedAt: now, error: null, updatedAt: now })
      .where(eq(purchaseRequests.id, requestId))
      .returning();
    return updated!;
  });
}

/**
 * The tail of the deadline held back from the optional, network-bound stages (market search and
 * the model's second opinion in the threat scan) so planning and TrustRail evaluation, which a
 * proposal cannot do without, still get time when those stages are slow.
 */
export function planningReserveMs(deadlineMs: number): number {
  return Math.min(15_000, Math.floor(deadlineMs / 3));
}

async function runResearch(rc: ResearchContext) {
  const demand = await forecastStage(rc);
  if (demand.needed.length === 0) return finishNothingToBuy(rc, demand);
  rc.run.reserve(planningReserveMs(rc.ctx.config.agent.deadlineMs));
  const market = await marketStage(rc, demand);
  const sourcing = await loadSourcing(rc, demand);
  sourcing.catalog = await threatScanStage(rc, demand, sourcing);
  rc.run.release();
  const candidatesByItem = await compareStage(rc, demand, sourcing);
  const outcome = await planAndEvaluateStage(rc, demand, sourcing, candidatesByItem);
  return finishResearch(rc, demand, market, outcome);
}

/* 1. Forecast ------------------------------------------------------------------------ */

async function forecastStage(rc: ResearchContext): Promise<Demand> {
  const { ctx, run, request, intent } = rc;
  const multiplier = request.demandMultiplier ?? intent.demand_multiplier ?? 1;
  const requestedIds = intent.inventory_item_ids ?? [];
  const fc = await run.tool(
    "forecast.compute",
    { demand_multiplier: multiplier, items: requestedIds.length },
    () =>
      runForecast(ctx.db, {
        organizationId: rc.orgId,
        userId: rc.userId,
        demandMultiplier: multiplier,
        itemIds: requestedIds.length ? requestedIds : undefined,
        requestId: rc.requestId,
        now: rc.now,
      }),
    (r) => `Forecast ${r.lines.length} item(s) at ${multiplier}× demand; ${r.lines.filter((l) => l.needs_reorder).length} need reorder.`,
  );
  await ctx.db.update(purchaseRequests).set({ forecastRunId: fc.run.id }).where(eq(purchaseRequests.id, rc.requestId));
  return {
    multiplier,
    lines: fc.lines,
    needed: fc.lines.filter((l) => l.needs_reorder && l.suggested_quantity > 0),
    itemRows: new Map(fc.items.map((i) => [i.row.id, i.row])),
  };
}

async function finishNothingToBuy(rc: ResearchContext, demand: Demand) {
  const { ctx, run } = rc;
  await run.skip("planner.plan", "No selected item is at or below its reorder point; nothing to buy.");
  await ctx.db
    .update(purchaseRequests)
    .set({
      status: "BLOCKED",
      recommendation: {
        summary: "Stock is above reorder points for the requested items — no purchase is needed.",
        rationale: demand.lines.map((l) => l.explanation),
        ai_mode: "DETERMINISTIC_FALLBACK",
      },
      researchCompletedAt: ctx.now(),
      updatedAt: ctx.now(),
    })
    .where(eq(purchaseRequests.id, rc.requestId));
  await run.finish("SUCCEEDED");
  return getRequestDto(ctx.db, rc.orgId, rc.requestId);
}

/* 2. Market research (Channel3) -------------------------------------------------------- */

const unavailableReference = (inventoryItemId: string): MarketReferenceDto => ({
  inventory_item_id: inventoryItemId,
  reference_unit_price_minor: null,
  sample_size: 0,
  observed_at: null,
  status: "UNAVAILABLE",
  quotes: [],
});

/**
 * Market evidence is optional: an item whose search would run into the planning reserve, or
 * that hits a call limit, gets an UNAVAILABLE reference (TrustRail then asks for a human price
 * review) instead of failing the research.
 */
async function marketStage(rc: ResearchContext, demand: Demand): Promise<MarketReferenceDto[]> {
  const market: MarketReferenceDto[] = [];
  const skipped: string[] = [];
  for (const line of demand.needed) {
    const item = demand.itemRows.get(line.inventory_item_id)!;
    if (rc.run.budgetMs <= 0) {
      skipped.push(item.name);
      market.push(unavailableReference(item.id));
      continue;
    }
    try {
      market.push(await researchMarketItem(rc, item));
    } catch (err) {
      if (!(err instanceof AgentBudgetExceeded)) throw err;
      market.push(unavailableReference(item.id));
    }
  }
  if (skipped.length) {
    await rc.run.skip(
      "market.search",
      `Time for market research ran out; skipped ${skipped.length} item(s), which need human price review: ${skipped.join(", ")}.`,
    );
  }
  await rc.ctx.db.update(purchaseRequests).set({ market }).where(eq(purchaseRequests.id, rc.requestId));
  return market;
}

async function researchMarketItem(rc: ResearchContext, item: InventoryRow): Promise<MarketReferenceDto> {
  const { ctx, run } = rc;
  const res = await run.tool(
    "market.search",
    { query: item.searchQuery, sku: item.sku },
    () =>
      researchItem(
        ctx.db,
        ctx.channel3,
        {
          organizationId: rc.orgId,
          requestId: rc.requestId,
          item,
          currency: rc.request.currency,
          now: rc.now,
          maxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours,
          signal: run.signal,
        },
        ctx.log,
      ),
    (r) =>
      r.reference.status === "DISABLED"
        ? `Market data disabled (no Channel3 key); ${item.name} requires human price review.`
        : `${r.reference.quotes.length} Channel3 listing(s) for ${item.name}; ${r.reference.sample_size} comparable; reference ${r.reference.status}.${r.error ? ` ${r.error}` : ""}`,
  );
  for (const s of res.suspicious) {
    await recordFinding(ctx.db, {
      organizationId: rc.orgId,
      type: "PROMPT_INJECTION",
      severity: s.score >= 5 ? "HIGH" : "MEDIUM",
      title: "Suspicious instructions in a market listing",
      description: `A Channel3 listing for ${item.name} contained text addressed to AI agents. It was excluded from price references.`,
      sourceKind: "market_quote",
      sourceId: s.quote.id,
      evidence: { title: s.quote.title, url: s.quote.url, signals: s.signals },
      relatedRequestId: rc.requestId,
    });
  }
  return res.reference;
}

/* 3. Threat scan of supplier content ---------------------------------------------------- */

async function loadSourcing(rc: ResearchContext, demand: Demand): Promise<Sourcing> {
  const mandateRow = await getActiveMandateRow(rc.ctx.db, rc.orgId);
  const supplierRows = await loadSuppliers(rc.ctx.db, rc.orgId);
  return {
    mandate: mandateRow ? rowToMandate(mandateRow) : null,
    supplierRows,
    supplierById: new Map(supplierRows.map((s) => [s.id, s])),
    catalog: await loadNeededCatalog(rc, demand),
  };
}

const loadNeededCatalog = (rc: ResearchContext, demand: Demand) =>
  loadCatalogForItems(
    rc.ctx.db,
    rc.orgId,
    demand.needed.map((n) => n.inventory_item_id),
  );

/** Scans every listing for injected instructions; returns the catalog re-read after quarantines. */
async function threatScanStage(rc: ResearchContext, demand: Demand, sourcing: Sourcing): Promise<CatalogRow[]> {
  const { run } = rc;
  let catalog = sourcing.catalog;
  await run.tool(
    "security.scan",
    { listings: catalog.length },
    async () => {
      let flagged = 0;
      for (const c of catalog) if (await scanListing(rc, sourcing, c)) flagged++;
      catalog = await loadNeededCatalog(rc, demand);
      return flagged;
    },
    (n) => (n ? `${n} supplier listing(s) contained suspicious instructions and were flagged.` : "No suspicious supplier content found."),
  );
  return catalog;
}

/** Returns whether the listing was flagged; quarantines it when the verdict calls for it. */
async function scanListing(rc: ResearchContext, sourcing: Sourcing, c: CatalogRow): Promise<boolean> {
  const { ctx, run } = rc;
  const text = `${c.title}\n${c.description}`;
  let verdict = detectPromptInjection(text);
  if (verdict.score > 0 && !verdict.quarantine)
    verdict = mergeVerdicts(verdict, await classifyInjection(ctx.openai, run, `catalog:${c.sku}`, text));
  if (!verdict.suspicious) return false;
  if (verdict.quarantine && !c.quarantined) {
    await ctx.db
      .update(supplierCatalogItems)
      .set({ quarantined: true, quarantineReason: verdict.signals.map((s) => s.rule).join(","), updatedAt: ctx.now() })
      .where(eq(supplierCatalogItems.id, c.id));
  }
  await recordFinding(ctx.db, {
    organizationId: rc.orgId,
    type: "PROMPT_INJECTION",
    severity: verdict.severity,
    title: `Prompt injection in ${sourcing.supplierById.get(c.supplierId)?.name ?? "supplier"} listing ${c.sku}`,
    description: verdict.quarantine
      ? "The listing contains instructions aimed at AI agents. It was quarantined: its text is withheld from the model and TrustRail will block any cart containing it."
      : "The listing contains suspicious phrasing. It is flagged for review.",
    sourceKind: "supplier_catalog_item",
    sourceId: c.id,
    evidence: { sku: c.sku, score: verdict.score, signals: verdict.signals },
    relatedRequestId: rc.requestId,
  });
  await appendAudit(ctx.db, {
    organizationId: rc.orgId,
    action: verdict.quarantine ? "security.source_quarantined" : "security.source_flagged",
    actorType: "SYSTEM",
    entityType: "supplier_catalog_item",
    entityId: c.id,
    data: { sku: c.sku, score: verdict.score, rules: verdict.signals.map((s) => s.rule), request_id: rc.requestId },
  });
  return true;
}

/* 4. Supplier comparison -------------------------------------------------------------- */

async function compareStage(rc: ResearchContext, demand: Demand, sourcing: Sourcing): Promise<Map<string, Candidate[]>> {
  const requiredBy = rc.request.requiredBy ?? rc.intent.required_by ?? null;
  const candidatesByItem = new Map<string, Candidate[]>();
  await rc.run.tool(
    "suppliers.compare",
    { items: demand.needed.length, listings: sourcing.catalog.length },
    async () => {
      for (const line of demand.needed) {
        const offers = sourcing.catalog
          .filter((c) => c.inventoryItemId === line.inventory_item_id)
          .map((c) => {
            const s = sourcing.supplierById.get(c.supplierId)!;
            return {
              offer: toOffer(c),
              supplier: toSupplierProfile(s, sourcing.mandate),
              storefront_lines: storefrontLines(s),
              quarantined: c.quarantined || s.quarantined,
            };
          });
        const evaluations = compareOffers({
          needed_units: line.suggested_quantity,
          currency: rc.request.currency,
          offers,
          required_by: requiredBy ? new Date(`${requiredBy}T23:59:59Z`) : null,
          now: rc.now,
        });
        candidatesByItem.set(line.inventory_item_id, await persistCandidates(rc, line.inventory_item_id, evaluations));
      }
      return [...candidatesByItem.values()].flat().length;
    },
    (n) => `Compared ${n} offer(s) on delivered cost per usable unit (items + shipping + tax + fees).`,
  );
  return candidatesByItem;
}

async function persistCandidates(rc: ResearchContext, inventoryItemId: string, evaluations: CandidateEvaluation[]): Promise<Candidate[]> {
  const withIds: Candidate[] = [];
  for (const e of evaluations) {
    const [row] = await rc.ctx.db
      .insert(purchaseCandidates)
      .values({
        organizationId: rc.orgId,
        requestId: rc.requestId,
        inventoryItemId,
        supplierId: e.supplier.id,
        catalogItemId: e.offer.id,
        packs: e.packs,
        units: e.units,
        quote: { ...e.quote, supplier_approved: e.supplier.approved },
        // A ranking metric (delivered cost per usable unit, fractional minor units), never an
        // amount that is charged: the charged amounts are the integer quote fields above.
        deliveredUnitCostMinor: e.delivered_unit_cost_minor,
        rank: e.rank,
        eligible: e.eligible,
        ineligibleReasons: e.ineligible_reasons,
        quarantined: e.quarantined,
      })
      .returning({ id: purchaseCandidates.id });
    withIds.push({ ...e, id: row!.id });
  }
  return withIds;
}

/* 5–6. Plan, evaluate with TrustRail, re-plan around blocks ----------------------------- */

/**
 * Each attempt re-plans ALL items with blocked suppliers excluded, so the owner's cap is always
 * spent on the most urgent items rather than on whichever cart was accepted first.
 */
async function planAndEvaluateStage(
  rc: ResearchContext,
  demand: Demand,
  sourcing: Sourcing,
  candidatesByItem: Map<string, Candidate[]>,
): Promise<PlanOutcome> {
  const { ctx, run, request, intent } = rc;
  const excludedSuppliers = new Set<string>();
  const blocked: PlanOutcome["blocked"] = [];
  let accepted: AcceptedCart[] = [];
  const cap = request.budgetLimitMinor ?? intent.budget_limit_minor ?? null;
  const priority = new Map(demand.needed.map((l) => [l.inventory_item_id, l.available / Math.max(0.01, l.forecast_daily_usage)]));
  const storefront = new Map<string, StorefrontQuoteLine[]>(sourcing.supplierRows.map((s) => [s.id, storefrontLines(s)]));
  const maxAttempts = request.allowAlternatives ? MAX_PLAN_ATTEMPTS : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const plan = await run.tool(
      "planner.plan",
      { attempt, excluded_suppliers: [...excludedSuppliers] },
      async () => {
        const p = planCarts({
          candidates_by_item: candidatesByItem,
          currency: request.currency,
          storefront_lines_by_supplier: storefront,
          excluded_supplier_ids: excludedSuppliers,
          excluded_candidate_ids: new Set(),
        });
        return { ...p, carts: cap === null ? p.carts : fitCartsToCap(p.carts, cap, priority, storefront) };
      },
      (p) =>
        `Attempt ${attempt}: ${p.carts.length} cart(s) planned${p.unfilled_item_ids.length ? `, ${p.unfilled_item_ids.length} item(s) without an eligible supplier` : ""}.`,
    );
    if (plan.carts.length === 0) break;

    const attemptAccepted: AcceptedCart[] = [];
    let attemptBlocked = false;
    for (const planned of plan.carts) {
      const supplier = sourcing.supplierById.get(planned.supplier.id) as SupplierRow;
      const { po, ev } = await evaluateCart(rc, sourcing, planned, supplier, attempt);
      const codes = ev.result.violations.map((v) => v.code);
      if (ev.result.decision === "BLOCK") {
        attemptBlocked = true;
        blocked.push({
          supplier: supplier.name,
          reasons: ev.result.violations.filter((v) => v.severity === "BLOCK").map((v) => v.message),
        });
        excludedSuppliers.add(supplier.id);
      } else {
        attemptAccepted.push({ planned, poId: po.id, decision: ev.result.decision, violations: codes });
      }
    }
    accepted = attemptAccepted;
    if (!attemptBlocked || attempt === maxAttempts) break;
    // A block changes the global plan: this attempt's compliant carts become superseded
    // evidence and the next attempt re-plans every item without the blocked supplier(s).
    if (attemptAccepted.length) {
      await ctx.db
        .update(purchaseOrders)
        .set({ status: "SUPERSEDED", updatedAt: ctx.now() })
        .where(
          inArray(
            purchaseOrders.id,
            attemptAccepted.map((a) => a.poId),
          ),
        );
    }
  }
  return { accepted, blocked };
}

/** Persists one planned cart as a proposal and runs TrustRail on it, recording the evidence. */
async function evaluateCart(rc: ResearchContext, sourcing: Sourcing, planned: PlannedCart, supplier: SupplierRow, attempt: number) {
  const { ctx, run } = rc;
  return run.tool(
    "trustrail.evaluate",
    { supplier: supplier.name, total_minor: planned.cart.total_minor },
    () =>
      ctx.db.transaction(async (tx) => {
        const po = await createProposal(tx, {
          organizationId: rc.orgId,
          requestId: rc.requestId,
          cart: planned.cart,
          lineMeta: planned.cart.lines.map((l) => {
            const match = planned.lines.find((x) => x.offer.sku === l.sku && l.kind === "PRODUCT");
            return {
              inventory_item_id: match?.inventory_item_id ?? null,
              catalog_item_id: match?.offer.id ?? null,
              pack_quantity: match?.offer.pack_quantity ?? null,
            };
          }),
          snapshot: {
            supplier: { id: supplier.id, name: supplier.name, fee_terms: supplier.feeTerms, tax_rate_bps: supplier.taxRateBps },
            catalog_prices: planned.lines.map((l) => ({
              sku: l.offer.sku,
              unit_price_minor: l.offer.unit_price_minor,
              pack_quantity: l.offer.pack_quantity,
            })),
            mandate_version: sourcing.mandate?.version ?? null,
            candidate_ids: planned.candidate_ids,
          },
          planAttempt: attempt,
          now: ctx.now(),
        });
        rc.createdProposalIds.push(po.id);
        const { po: fresh, items } = await loadOrder(tx, rc.orgId, po.id);
        const ev = await evaluateOrder(tx, rc.orgId, fresh, items, {
          stage: "EVALUATE",
          now: ctx.now(),
          marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours,
        });
        const isBlocked = ev.result.decision === "BLOCK";
        if (isBlocked) {
          await tx.update(purchaseOrders).set({ status: "BLOCKED", updatedAt: ctx.now() }).where(eq(purchaseOrders.id, po.id));
        }
        await appendAudit(tx, {
          organizationId: rc.orgId,
          action: isBlocked ? "trustrail.cart_blocked" : "trustrail.cart_evaluated",
          actorType: "SYSTEM",
          entityType: "purchase_order",
          entityId: po.id,
          data: {
            decision: ev.result.decision,
            violations: ev.result.violations.map((v) => v.code),
            total_minor: planned.cart.total_minor,
            policy_decision_id: ev.decisionId,
            input_digest: ev.result.input_digest,
          },
        });
        if (isBlocked) {
          const fee = ev.result.violations.find((v) => v.code === "UNAUTHORIZED_LINE_ITEM");
          await recordFinding(tx, {
            organizationId: rc.orgId,
            type: fee ? "UNAUTHORIZED_FEE" : "POLICY_VIOLATION",
            severity: "HIGH",
            title: `TrustRail blocked a ${supplier.name} cart`,
            description: ev.result.violations
              .filter((v) => v.severity === "BLOCK")
              .map((v) => v.message)
              .join(" "),
            sourceKind: "purchase_order",
            sourceId: po.id,
            evidence: { violations: ev.result.violations, total_minor: planned.cart.total_minor },
            relatedPurchaseOrderId: po.id,
            relatedRequestId: rc.requestId,
          });
        }
        return { po, ev };
      }),
    (r) =>
      `${supplier.name}: ${r.ev.result.decision}${r.ev.result.violations.length ? ` (${r.ev.result.violations.map((v) => v.code).join(", ")})` : ""}.`,
  );
}

/* 7. Explanation and completion ------------------------------------------------------- */

/**
 * The proposals are already evaluated and persisted, so a run out of time or steps still
 * completes: the explanation falls back to the deterministic one, which needs neither.
 */
async function explain(rc: ResearchContext, facts: ExplanationFacts) {
  const { ctx, run } = rc;
  try {
    return await run.tool(
      "recommendation.explain",
      { proposals: facts.proposals.length },
      () => explainRecommendation(ctx.openai, run, facts),
      (e) => `Explanation (${e.mode === "LLM" ? "model" : "deterministic"}).`,
    );
  } catch (err) {
    if (!(err instanceof AgentBudgetExceeded)) throw err;
    await run.skip("recommendation.explain", "The agent's time or step budget ran out; the explanation is deterministic.");
    return { ...deterministicExplanation(facts), mode: "DETERMINISTIC_FALLBACK" as const };
  }
}

async function finishResearch(rc: ResearchContext, demand: Demand, market: MarketReferenceDto[], outcome: PlanOutcome) {
  const { ctx, run } = rc;
  const { accepted } = outcome;
  const covered = new Set(accepted.flatMap((a) => a.planned.lines.map((l) => l.inventory_item_id)));
  const unfilled = demand.needed.map((l) => l.inventory_item_id).filter((id) => !covered.has(id));
  const facts: ExplanationFacts = {
    intent_notes: rc.intent.notes ?? "",
    demand_multiplier: demand.multiplier,
    proposals: accepted.map((a) => ({
      supplier: a.planned.supplier.name,
      total_minor: a.planned.cart.total_minor,
      decision: a.decision,
      violations: a.violations,
      lines: a.planned.lines.map((l) => `${l.packs} × ${l.offer.title} (${l.units} units)`),
    })),
    blocked: outcome.blocked,
    unfilled_items: unfilled.map((id) => demand.itemRows.get(id)?.name ?? id),
    market_status: market.map(
      (m) =>
        `${demand.itemRows.get(m.inventory_item_id)?.name}: market reference ${m.status.toLowerCase()}${m.reference_unit_price_minor !== null ? ` at ${m.reference_unit_price_minor.toFixed(2)}¢/unit` : ""}.`,
    ),
  };
  const explanation = await explain(rc, facts);

  await ctx.db
    .update(purchaseRequests)
    .set({
      status: accepted.length ? "READY_FOR_REVIEW" : "BLOCKED",
      recommendation: { summary: explanation.summary, rationale: explanation.rationale, ai_mode: explanation.mode },
      researchCompletedAt: ctx.now(),
      updatedAt: ctx.now(),
    })
    .where(eq(purchaseRequests.id, rc.requestId));
  await refreshRequestStatus(ctx.db, rc.requestId, ctx.now());
  await run.finish("SUCCEEDED");

  void (accepted.length
    ? ctx.notifier.send({
        kind: "APPROVAL_REQUIRED",
        organization_id: rc.orgId,
        title: "Purchase ready for approval",
        summary: explanation.summary,
        link_path: `/procurement/${rc.requestId}`,
      })
    : ctx.notifier.send({
        kind: "PURCHASE_BLOCKED",
        organization_id: rc.orgId,
        title: "No compliant purchase found",
        summary: explanation.summary,
        link_path: `/procurement/${rc.requestId}`,
      }));

  return getRequestDto(ctx.db, rc.orgId, rc.requestId);
}

/**
 * Jointly trims carts so their combined total fits the owner's cap, dropping the items with the
 * most remaining days of cover first. Quantities are never increased.
 */
export function fitCartsToCap(
  carts: PlannedCart[],
  cap: number,
  priority: Map<string, number>,
  storefront: Map<string, StorefrontQuoteLine[]>,
): PlannedCart[] {
  let working = carts.map((c) => ({ ...c, lines: [...c.lines] }));
  const total = () => working.reduce((a, c) => a + c.cart.total_minor, 0);
  while (working.length > 0 && total() > cap) {
    // Find the least urgent line across all carts.
    let worst: { ci: number; li: number; p: number } | null = null;
    working.forEach((c, ci) =>
      c.lines.forEach((l, li) => {
        const p = priority.get(l.inventory_item_id) ?? 0;
        if (!worst || p > worst.p) worst = { ci, li, p };
      }),
    );
    if (!worst) break;
    const { ci, li } = worst as { ci: number; li: number };
    const cart = working[ci]!;
    cart.lines.splice(li, 1);
    cart.candidate_ids = cart.candidate_ids.filter((_, i) => i !== li);
    if (cart.lines.length === 0) {
      working = working.filter((_, i) => i !== ci);
      continue;
    }
    cart.cart = buildSupplierQuote(
      cart.supplier,
      cart.lines.map((l) => ({ offer: l.offer, packs: l.packs })),
      cart.cart.currency,
      storefront.get(cart.supplier.id) ?? [],
    );
  }
  return working;
}
