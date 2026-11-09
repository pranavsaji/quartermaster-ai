import { and, eq, inArray } from "drizzle-orm";
import type { MarketReferenceDto } from "@qm/contracts";
import { purchaseCandidates, purchaseOrders, purchaseRequests, supplierCatalogItems } from "@qm/database";
import {
  buildSupplierQuote,
  compareOffers,
  planCarts,
  type CandidateEvaluation,
  type PlannedCart,
  type StorefrontQuoteLine,
} from "@qm/quartermaster";
import { detectPromptInjection, mergeVerdicts } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { conflict, notFound } from "../../errors";
import { appendAudit } from "../audit";
import { recordFinding } from "../findings";
import { runForecast, type InventoryRow } from "../inventory";
import { getActiveMandateRow, rowToMandate } from "../mandates";
import { researchItem } from "../market";
import { createProposal, loadOrder } from "../orders";
import { evaluateOrder } from "../policy";
import { loadCatalogForItems, loadSuppliers, storefrontLines, toOffer, toSupplierProfile, type SupplierRow } from "../suppliers";
import { AgentBudgetExceeded, AgentRun } from "../agent/runtime";
import { classifyInjection, explainRecommendation, type ExplanationFacts } from "../agent/llm";
import { getRequestDto } from "./dto";
import { refreshRequestStatus } from "./status";

const MAX_PLAN_ATTEMPTS = 3;
const RESEARCHABLE = ["DRAFT", "READY_FOR_REVIEW", "BLOCKED", "FAILED"];

/**
 * The bounded research workflow:
 *   forecast → market research → threat scan → supplier comparison → planning → TrustRail
 *   evaluation (with re-planning around blocked suppliers) → explanation.
 * The agent proposes; it never approves or pays.
 */
export async function researchRequest(ctx: AppContext, user: { id: string; organizationId: string }, requestId: string) {
  const now = ctx.now();
  const orgId = user.organizationId;

  // Atomically claim the request for research so concurrent calls cannot interleave.
  const [claimed] = await ctx.db
    .update(purchaseRequests)
    .set({ status: "RESEARCHING", researchStartedAt: now, error: null, updatedAt: now })
    .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, orgId), inArray(purchaseRequests.status, RESEARCHABLE)))
    .returning();
  if (!claimed) {
    const [existing] = await ctx.db.select().from(purchaseRequests).where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.organizationId, orgId)));
    if (!existing) throw notFound("Procurement request");
    throw conflict("REQUEST_NOT_RESEARCHABLE", `Request is ${existing.status}; research can only run before approval.`);
  }
  const committed = await ctx.db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.requestId, requestId), inArray(purchaseOrders.status, ["APPROVED", "PAYMENT_PENDING", "PAID", "FULFILLED"])));
  if (committed.length > 0) {
    await refreshRequestStatus(ctx.db, requestId, now);
    throw conflict("REQUEST_HAS_APPROVED_ORDERS", "Research cannot be re-run after an order has been approved.");
  }

  // Previous proposals become superseded evidence; candidates are recomputed.
  await ctx.db
    .update(purchaseOrders)
    .set({ status: "SUPERSEDED", updatedAt: now })
    .where(and(eq(purchaseOrders.requestId, requestId), inArray(purchaseOrders.status, ["PROPOSED", "BLOCKED"])));
  await ctx.db.delete(purchaseCandidates).where(eq(purchaseCandidates.requestId, requestId));

  const run = await AgentRun.start(ctx.db, {
    organizationId: orgId,
    requestId,
    kind: "RESEARCH",
    limits: { maxToolCalls: 60, maxResearchCalls: ctx.config.agent.maxResearchCalls, deadlineMs: ctx.config.agent.deadlineMs, tokenBudget: ctx.config.agent.tokenBudget },
  });
  run.aiMode = ctx.openai.enabled ? "LLM" : "DETERMINISTIC_FALLBACK";

  try {
    const intent = (claimed.intent ?? {}) as { inventory_item_ids?: string[]; demand_multiplier?: number; notes?: string; budget_limit_minor?: number | null; required_by?: string | null };
    const multiplier = claimed.demandMultiplier ?? intent.demand_multiplier ?? 1;
    const requestedIds = intent.inventory_item_ids ?? [];

    /* 1. Forecast ------------------------------------------------------------------ */
    const fc = await run.tool(
      "forecast.compute",
      { demand_multiplier: multiplier, items: requestedIds.length },
      () => runForecast(ctx.db, { organizationId: orgId, userId: user.id, demandMultiplier: multiplier, itemIds: requestedIds.length ? requestedIds : undefined, requestId, now }),
      (r) => `Forecast ${r.lines.length} item(s) at ${multiplier}× demand; ${r.lines.filter((l) => l.needs_reorder).length} need reorder.`,
    );
    await ctx.db.update(purchaseRequests).set({ forecastRunId: fc.run.id }).where(eq(purchaseRequests.id, requestId));
    const needed = fc.lines.filter((l) => l.needs_reorder && l.suggested_quantity > 0);
    const itemRows = new Map<string, InventoryRow>(fc.items.map((i) => [i.row.id, i.row]));

    if (needed.length === 0) {
      await run.skip("planner.plan", "No selected item is at or below its reorder point; nothing to buy.");
      await ctx.db
        .update(purchaseRequests)
        .set({
          status: "BLOCKED",
          recommendation: { summary: "Stock is above reorder points for the requested items — no purchase is needed.", rationale: fc.lines.map((l) => l.explanation), ai_mode: "DETERMINISTIC_FALLBACK" },
          researchCompletedAt: ctx.now(),
          updatedAt: ctx.now(),
        })
        .where(eq(purchaseRequests.id, requestId));
      await run.finish("SUCCEEDED");
      return getRequestDto(ctx.db, orgId, requestId);
    }

    /* 2. Market research (Channel3) -------------------------------------------------- */
    const market: MarketReferenceDto[] = [];
    for (const line of needed) {
      const item = itemRows.get(line.inventory_item_id)!;
      try {
        const res = await run.tool(
          "market.search",
          { query: item.searchQuery, sku: item.sku },
          () => researchItem(ctx.db, ctx.channel3, { organizationId: orgId, requestId, item, currency: claimed.currency, now, maxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours }),
          (r) =>
            r.reference.status === "DISABLED"
              ? `Market data disabled (no Channel3 key); ${item.name} requires human price review.`
              : `${r.reference.quotes.length} Channel3 listing(s) for ${item.name}; ${r.reference.sample_size} comparable; reference ${r.reference.status}.${r.error ? ` ${r.error}` : ""}`,
        );
        market.push(res.reference);
        for (const s of res.suspicious) {
          await recordFinding(ctx.db, {
            organizationId: orgId,
            type: "PROMPT_INJECTION",
            severity: s.score >= 5 ? "HIGH" : "MEDIUM",
            title: "Suspicious instructions in a market listing",
            description: `A Channel3 listing for ${item.name} contained text addressed to AI agents. It was excluded from price references.`,
            sourceKind: "market_quote",
            sourceId: s.quote.id,
            evidence: { title: s.quote.title, url: s.quote.url, signals: s.signals },
            relatedRequestId: requestId,
          });
        }
      } catch (err) {
        if (err instanceof AgentBudgetExceeded) {
          market.push({ inventory_item_id: item.id, reference_unit_price_minor: null, sample_size: 0, observed_at: null, status: "UNAVAILABLE", quotes: [] });
          continue;
        }
        throw err;
      }
    }
    await ctx.db.update(purchaseRequests).set({ market }).where(eq(purchaseRequests.id, requestId));

    /* 3. Threat scan of supplier content -------------------------------------------- */
    const mandateRow = await getActiveMandateRow(ctx.db, orgId);
    const mandate = mandateRow ? rowToMandate(mandateRow) : null;
    const supplierRows = await loadSuppliers(ctx.db, orgId);
    const supplierById = new Map(supplierRows.map((s) => [s.id, s]));
    let catalog = await loadCatalogForItems(ctx.db, orgId, needed.map((n) => n.inventory_item_id));

    await run.tool(
      "security.scan",
      { listings: catalog.length },
      async () => {
        let flagged = 0;
        for (const c of catalog) {
          const text = `${c.title}\n${c.description}`;
          let verdict = detectPromptInjection(text);
          if (verdict.score > 0 && !verdict.quarantine) verdict = mergeVerdicts(verdict, await classifyInjection(ctx.openai, run, `catalog:${c.sku}`, text));
          if (!verdict.suspicious) continue;
          flagged++;
          if (verdict.quarantine && !c.quarantined) {
            await ctx.db
              .update(supplierCatalogItems)
              .set({ quarantined: true, quarantineReason: verdict.signals.map((s) => s.rule).join(","), updatedAt: ctx.now() })
              .where(eq(supplierCatalogItems.id, c.id));
          }
          await recordFinding(ctx.db, {
            organizationId: orgId,
            type: "PROMPT_INJECTION",
            severity: verdict.severity,
            title: `Prompt injection in ${supplierById.get(c.supplierId)?.name ?? "supplier"} listing ${c.sku}`,
            description: verdict.quarantine
              ? "The listing contains instructions aimed at AI agents. It was quarantined: its text is withheld from the model and TrustRail will block any cart containing it."
              : "The listing contains suspicious phrasing. It is flagged for review.",
            sourceKind: "supplier_catalog_item",
            sourceId: c.id,
            evidence: { sku: c.sku, score: verdict.score, signals: verdict.signals },
            relatedRequestId: requestId,
          });
          await appendAudit(ctx.db, {
            organizationId: orgId,
            action: verdict.quarantine ? "security.source_quarantined" : "security.source_flagged",
            actorType: "SYSTEM",
            entityType: "supplier_catalog_item",
            entityId: c.id,
            data: { sku: c.sku, score: verdict.score, rules: verdict.signals.map((s) => s.rule), request_id: requestId },
          });
        }
        catalog = await loadCatalogForItems(ctx.db, orgId, needed.map((n) => n.inventory_item_id));
        return flagged;
      },
      (n) => (n ? `${n} supplier listing(s) contained suspicious instructions and were flagged.` : "No suspicious supplier content found."),
    );

    /* 4. Supplier comparison ---------------------------------------------------------- */
    const requiredBy = claimed.requiredBy ?? intent.required_by ?? null;
    const candidatesByItem = new Map<string, (CandidateEvaluation & { id: string })[]>();
    await run.tool(
      "suppliers.compare",
      { items: needed.length, listings: catalog.length },
      async () => {
        for (const line of needed) {
          const offers = catalog
            .filter((c) => c.inventoryItemId === line.inventory_item_id)
            .map((c) => {
              const s = supplierById.get(c.supplierId)!;
              return { offer: toOffer(c), supplier: toSupplierProfile(s, mandate), storefront_lines: storefrontLines(s), quarantined: c.quarantined || s.quarantined };
            });
          const evaluations = compareOffers({
            needed_units: line.suggested_quantity,
            currency: claimed.currency,
            offers,
            required_by: requiredBy ? new Date(`${requiredBy}T23:59:59Z`) : null,
            now,
          });
          const withIds: (CandidateEvaluation & { id: string })[] = [];
          for (const e of evaluations) {
            const [row] = await ctx.db
              .insert(purchaseCandidates)
              .values({
                organizationId: orgId,
                requestId,
                inventoryItemId: line.inventory_item_id,
                supplierId: e.supplier.id,
                catalogItemId: e.offer.id,
                packs: e.packs,
                units: e.units,
                quote: { ...e.quote, supplier_approved: e.supplier.approved },
                deliveredUnitCostMinor: e.delivered_unit_cost_minor,
                rank: e.rank,
                eligible: e.eligible,
                ineligibleReasons: e.ineligible_reasons,
                quarantined: e.quarantined,
              })
              .returning({ id: purchaseCandidates.id });
            withIds.push({ ...e, id: row!.id });
          }
          candidatesByItem.set(line.inventory_item_id, withIds);
        }
        return [...candidatesByItem.values()].flat().length;
      },
      (n) => `Compared ${n} offer(s) on delivered cost per usable unit (items + shipping + tax + fees).`,
    );

    /* 5–6. Plan, evaluate with TrustRail, re-plan around blocks ---------------------- */
    const excludedSuppliers = new Set<string>();
    const blocked: ExplanationFacts["blocked"] = [];
    const accepted: { planned: PlannedCart; poId: string; decision: string; violations: string[] }[] = [];
    let remainingItems = new Map(candidatesByItem);
    let unfilled: string[] = [];
    const cap = claimed.budgetLimitMinor ?? intent.budget_limit_minor ?? null;
    const priority = new Map(needed.map((l) => [l.inventory_item_id, l.available / Math.max(0.01, l.forecast_daily_usage)]));

    for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS && remainingItems.size > 0; attempt++) {
      const plan = await run.tool(
        "planner.plan",
        { attempt, excluded_suppliers: [...excludedSuppliers] },
        async () => {
          const storefront = new Map<string, StorefrontQuoteLine[]>(supplierRows.map((s) => [s.id, storefrontLines(s)]));
          const p = planCarts({
            candidates_by_item: remainingItems,
            currency: claimed.currency,
            storefront_lines_by_supplier: storefront,
            excluded_supplier_ids: excludedSuppliers,
            excluded_candidate_ids: new Set(),
          });
          const spentSoFar = accepted.reduce((a, x) => a + x.planned.cart.total_minor, 0);
          return { ...p, carts: cap === null ? p.carts : fitCartsToCap(p.carts, cap - spentSoFar, priority, storefront) };
        },
        (p) => `Attempt ${attempt}: ${p.carts.length} cart(s) planned${p.unfilled_item_ids.length ? `, ${p.unfilled_item_ids.length} item(s) without an eligible supplier` : ""}.`,
      );
      unfilled = plan.unfilled_item_ids;
      if (plan.carts.length === 0) break;

      const nextRemaining = new Map<string, (CandidateEvaluation & { id: string })[]>();
      for (const planned of plan.carts) {
        const supplier = supplierById.get(planned.supplier.id) as SupplierRow;
        const evaluation = await run.tool(
          "trustrail.evaluate",
          { supplier: supplier.name, total_minor: planned.cart.total_minor },
          () =>
            ctx.db.transaction(async (tx) => {
              const po = await createProposal(tx, {
                organizationId: orgId,
                requestId,
                cart: planned.cart,
                lineMeta: planned.cart.lines.map((l) => {
                  const match = planned.lines.find((x) => x.offer.sku === l.sku && l.kind === "PRODUCT");
                  return { inventory_item_id: match?.inventory_item_id ?? null, catalog_item_id: match?.offer.id ?? null, pack_quantity: match?.offer.pack_quantity ?? null };
                }),
                snapshot: {
                  supplier: { id: supplier.id, name: supplier.name, fee_terms: supplier.feeTerms, tax_rate_bps: supplier.taxRateBps },
                  catalog_prices: planned.lines.map((l) => ({ sku: l.offer.sku, unit_price_minor: l.offer.unit_price_minor, pack_quantity: l.offer.pack_quantity })),
                  mandate_version: mandate?.version ?? null,
                  candidate_ids: planned.candidate_ids,
                },
                planAttempt: attempt,
                now: ctx.now(),
              });
              const { po: fresh, items } = await loadOrder(tx, orgId, po.id);
              const ev = await evaluateOrder(tx, orgId, fresh, items, { stage: "EVALUATE", now: ctx.now(), marketMaxAgeHours: ctx.config.agent.marketReferenceMaxAgeHours });
              if (ev.result.decision === "BLOCK") {
                await tx.update(purchaseOrders).set({ status: "BLOCKED", updatedAt: ctx.now() }).where(eq(purchaseOrders.id, po.id));
              }
              await appendAudit(tx, {
                organizationId: orgId,
                action: ev.result.decision === "BLOCK" ? "trustrail.cart_blocked" : "trustrail.cart_evaluated",
                actorType: "SYSTEM",
                entityType: "purchase_order",
                entityId: po.id,
                data: { decision: ev.result.decision, violations: ev.result.violations.map((v) => v.code), total_minor: planned.cart.total_minor, policy_decision_id: ev.decisionId, input_digest: ev.result.input_digest },
              });
              if (ev.result.decision === "BLOCK") {
                const fee = ev.result.violations.find((v) => v.code === "UNAUTHORIZED_LINE_ITEM");
                await recordFinding(tx, {
                  organizationId: orgId,
                  type: fee ? "UNAUTHORIZED_FEE" : "POLICY_VIOLATION",
                  severity: "HIGH",
                  title: `TrustRail blocked a ${supplier.name} cart`,
                  description: ev.result.violations.filter((v) => v.severity === "BLOCK").map((v) => v.message).join(" "),
                  sourceKind: "purchase_order",
                  sourceId: po.id,
                  evidence: { violations: ev.result.violations, total_minor: planned.cart.total_minor },
                  relatedPurchaseOrderId: po.id,
                  relatedRequestId: requestId,
                });
              }
              return { po, ev };
            }),
          (r) => `${supplier.name}: ${r.ev.result.decision}${r.ev.result.violations.length ? ` (${r.ev.result.violations.map((v) => v.code).join(", ")})` : ""}.`,
        );

        const codes = evaluation.ev.result.violations.map((v) => v.code);
        if (evaluation.ev.result.decision === "BLOCK") {
          blocked.push({ supplier: supplier.name, reasons: evaluation.ev.result.violations.filter((v) => v.severity === "BLOCK").map((v) => v.message) });
          excludedSuppliers.add(supplier.id);
          if (claimed.allowAlternatives) for (const l of planned.lines) nextRemaining.set(l.inventory_item_id, remainingItems.get(l.inventory_item_id) ?? []);
        } else {
          accepted.push({ planned, poId: evaluation.po.id, decision: evaluation.ev.result.decision, violations: codes });
        }
      }
      remainingItems = nextRemaining;
    }

    /* 7. Explanation --------------------------------------------------------------- */
    const facts: ExplanationFacts = {
      intent_notes: intent.notes ?? "",
      demand_multiplier: multiplier,
      proposals: accepted.map((a) => ({
        supplier: a.planned.supplier.name,
        total_minor: a.planned.cart.total_minor,
        decision: a.decision,
        violations: a.violations,
        lines: a.planned.lines.map((l) => `${l.packs} × ${l.offer.title} (${l.units} units)`),
      })),
      blocked,
      unfilled_items: [...unfilled, ...remainingItems.keys()].map((id) => itemRows.get(id)?.name ?? id),
      market_status: market.map((m) => `${itemRows.get(m.inventory_item_id)?.name}: market reference ${m.status.toLowerCase()}${m.reference_unit_price_minor !== null ? ` at ${m.reference_unit_price_minor.toFixed(2)}¢/unit` : ""}.`),
    };
    const explanation = await run.tool("recommendation.explain", { proposals: accepted.length }, () => explainRecommendation(ctx.openai, run, facts), (e) => `Explanation (${e.mode === "LLM" ? "model" : "deterministic"}).`);

    await ctx.db
      .update(purchaseRequests)
      .set({
        status: accepted.length ? "READY_FOR_REVIEW" : "BLOCKED",
        recommendation: { summary: explanation.summary, rationale: explanation.rationale, ai_mode: explanation.mode },
        researchCompletedAt: ctx.now(),
        updatedAt: ctx.now(),
      })
      .where(eq(purchaseRequests.id, requestId));
    await refreshRequestStatus(ctx.db, requestId, ctx.now());
    await run.finish("SUCCEEDED");

    void (accepted.length
      ? ctx.notifier.send({ kind: "APPROVAL_REQUIRED", organization_id: orgId, title: "Purchase ready for approval", summary: explanation.summary, link_path: `/procurement/${requestId}` })
      : ctx.notifier.send({ kind: "PURCHASE_BLOCKED", organization_id: orgId, title: "No compliant purchase found", summary: explanation.summary, link_path: `/procurement/${requestId}` }));

    return getRequestDto(ctx.db, orgId, requestId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.log.error({ err, requestId }, "research failed");
    await run.finish("FAILED", message);
    await ctx.db.update(purchaseRequests).set({ status: "FAILED", error: message.slice(0, 500), updatedAt: ctx.now() }).where(eq(purchaseRequests.id, requestId));
    throw err;
  }
}

/**
 * Jointly trims carts so their combined total fits the owner's cap, dropping the items with the
 * most remaining days of cover first. Quantities are never increased.
 */
export function fitCartsToCap(carts: PlannedCart[], cap: number, priority: Map<string, number>, storefront: Map<string, StorefrontQuoteLine[]>): PlannedCart[] {
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
    cart.cart = buildSupplierQuote(cart.supplier, cart.lines.map((l) => ({ offer: l.offer, packs: l.packs })), cart.cart.currency, storefront.get(cart.supplier.id) ?? []);
  }
  return working;
}
