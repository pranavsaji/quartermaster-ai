import { and, eq, gte, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { COMMITTED_PO_STATUSES, type ProductCategory } from "@qm/contracts";
import {
  budgetReservations,
  forecastRuns,
  organizations,
  policyDecisions,
  purchaseOrderItems,
  purchaseOrders,
  purchaseRequests,
  suppliers,
  type DbOrTx,
} from "@qm/database";
import { evaluatePolicy, type CatalogEntry, type PolicyInput, type PolicyResult, type Violation } from "@qm/trustrail";
import { currentAccount } from "./budget";
import { getActiveMandateRow, rowToMandate } from "./mandates";
import { cartFromRows, type PurchaseOrderItemRow, type PurchaseOrderRow } from "./orders";
import { loadCatalogForSupplier } from "./suppliers";

export interface EvaluateOptions {
  stage: "EVALUATE" | "APPROVE" | "CAPTURE";
  now: Date;
  /** Lock the budget account row (approval path). */
  lockBudget?: boolean;
  /** At capture time the order's own reservation is already counted; exclude it. */
  excludeOwnReservationForIntent?: string | null;
  marketMaxAgeHours: number;
}

/* ------------------------------------------------------- Stored request facts (JSONB) */

const minor = z.number().int().refine(Number.isSafeInteger, "not a safe integer");

/**
 * The interpreted intent stored on a request. Only the fields the system acts on are validated;
 * anything else in the document is ignored.
 */
export const StoredIntent = z.object({
  inventory_item_ids: z.array(z.string()).optional(),
  demand_multiplier: z.number().finite().positive().optional(),
  notes: z.string().optional(),
  budget_limit_minor: minor.nonnegative().nullish(),
  required_by: z.string().nullish(),
});
export type StoredIntent = z.infer<typeof StoredIntent>;

/** A request's market evidence, as far as TrustRail reads it. */
const StoredMarketReferences = z.array(
  z.object({
    inventory_item_id: z.string(),
    reference_unit_price_minor: z.number().finite().nonnegative().nullable(),
    observed_at: z.string().nullable(),
    status: z.enum(["AVAILABLE", "UNAVAILABLE", "STALE", "DISABLED", "ERROR"]),
  }),
);

/** A forecast run's lines, as far as TrustRail reads them. */
const StoredForecastLines = z.array(z.object({ inventory_item_id: z.string(), suggested_quantity: z.number().finite().nonnegative() }));

/** Parses a request's stored intent; a missing intent is an empty one. Null when malformed. */
export function parseStoredIntent(raw: unknown): StoredIntent | null {
  const r = StoredIntent.safeParse(raw ?? {});
  return r.success ? r.data : null;
}

/**
 * Decision returned when facts read from the database are malformed: whatever the engine
 * concluded from the remaining facts, the evaluation fails closed with POLICY_INPUT_INVALID.
 */
export function failClosedOnMalformedFacts(result: PolicyResult, malformed: string[]): PolicyResult {
  if (malformed.length === 0) return result;
  const violation: Violation = {
    code: "POLICY_INPUT_INVALID",
    severity: "BLOCK",
    message: "Stored request facts are malformed; evaluation failed closed.",
    evidence: { facts: malformed },
  };
  return {
    ...result,
    decision: "BLOCK",
    human_approval_required: true,
    violations: [...result.violations, violation],
    checks: [...result.checks, { code: "REQUEST_FACTS_VALID", passed: false, detail: `Malformed stored facts: ${malformed.join(", ")}.` }],
  };
}

/* ---------------------------------------------------------------------- Evaluation */

/** One TrustRail evaluation of an order, before or after it is recorded. */
export interface PolicyEvaluation {
  result: PolicyResult;
  input: PolicyInput;
  mandateId: string | null;
  purchaseOrderId: string;
  requestId: string | null;
  stage: EvaluateOptions["stage"];
  evaluatedAt: Date;
}

/**
 * Gathers every fact TrustRail needs from the system of record (never from the agent) and runs
 * the deterministic policy, then persists the decision with a digest of its inputs.
 */
export async function evaluateOrder(
  tx: DbOrTx,
  organizationId: string,
  po: PurchaseOrderRow,
  items: PurchaseOrderItemRow[],
  opts: EvaluateOptions,
): Promise<PolicyEvaluation & { decisionId: string }> {
  const evaluation = await assessOrder(tx, organizationId, po, items, opts);
  return { ...evaluation, decisionId: await recordDecision(tx, organizationId, evaluation) };
}

/**
 * Persists a decision as evidence. Callers that refuse an operation inside a transaction (a BLOCK
 * at approval, a refused capture) call it again from their DeferredFailure follow-up, because the
 * row written inside the transaction is rolled back with it.
 */
export async function recordDecision(db: DbOrTx, organizationId: string, evaluation: PolicyEvaluation): Promise<string> {
  const { result } = evaluation;
  const [row] = await db
    .insert(policyDecisions)
    .values({
      organizationId,
      purchaseOrderId: evaluation.purchaseOrderId,
      requestId: evaluation.requestId,
      stage: evaluation.stage,
      decision: result.decision,
      violations: result.violations,
      checks: result.checks,
      humanApprovalRequired: result.human_approval_required,
      mandateId: evaluation.mandateId,
      mandateVersion: result.mandate_version,
      policyVersion: result.policy_version,
      inputDigest: result.input_digest,
      createdAt: evaluation.evaluatedAt,
    })
    .returning({ id: policyDecisions.id });
  return row!.id;
}

/** Runs TrustRail on an order without recording the decision (see recordDecision). */
export async function assessOrder(
  tx: DbOrTx,
  organizationId: string,
  po: PurchaseOrderRow,
  items: PurchaseOrderItemRow[],
  opts: EvaluateOptions,
): Promise<PolicyEvaluation> {
  const mandateRow = await getActiveMandateRow(tx, organizationId);
  const mandate = mandateRow ? rowToMandate(mandateRow) : null;
  const [org] = await tx.select().from(organizations).where(eq(organizations.id, organizationId));
  const [supplier] = await tx
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, po.supplierId), eq(suppliers.organizationId, organizationId)));
  const catalogRows = await loadCatalogForSupplier(tx, organizationId, po.supplierId);

  const account = await currentAccount(tx, {
    organizationId,
    timeZone: org!.timezone,
    currency: org!.currency,
    weeklyLimitMinor: mandate?.weekly_budget_minor ?? 0,
    now: opts.now,
    lock: Boolean(opts.lockBudget),
  });
  let reserved = account.reservedMinor;
  if (opts.excludeOwnReservationForIntent) {
    const [own] = await tx
      .select()
      .from(budgetReservations)
      .where(
        and(
          eq(budgetReservations.intentId, opts.excludeOwnReservationForIntent),
          eq(budgetReservations.status, "ACTIVE"),
          eq(budgetReservations.budgetAccountId, account.id),
        ),
      );
    if (own) reserved -= own.amountMinor;
  }

  // Request-level facts: owner's budget cap (net of other committed orders), forecast need and market evidence.
  // JSONB documents are parsed, never cast: a malformed one makes the evaluation fail closed.
  let requestLimit: number | null = null;
  const neededBySku: Record<string, number> = {};
  const packBySku: Record<string, number> = {};
  const malformed: string[] = [];
  let market: z.infer<typeof StoredMarketReferences> = [];
  if (po.requestId) {
    const [req] = await tx.select().from(purchaseRequests).where(eq(purchaseRequests.id, po.requestId));
    if (req) {
      const parsedMarket = StoredMarketReferences.safeParse(req.market ?? []);
      if (parsedMarket.success) market = parsedMarket.data;
      else malformed.push("market");
      const intent = parseStoredIntent(req.intent);
      if (!intent) malformed.push("intent");
      const cap = req.budgetLimitMinor ?? intent?.budget_limit_minor ?? null;
      if (cap !== null && cap !== undefined) {
        const others = await tx
          .select({ total: purchaseOrders.totalMinor })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.requestId, req.id),
              ne(purchaseOrders.id, po.id),
              inArray(purchaseOrders.status, [...COMMITTED_PO_STATUSES]),
            ),
          );
        requestLimit = cap - others.reduce((a, o) => a + o.total, 0);
      }
      if (req.forecastRunId) {
        const [run] = await tx.select().from(forecastRuns).where(eq(forecastRuns.id, req.forecastRunId));
        const parsedLines = StoredForecastLines.safeParse(run?.lines ?? []);
        if (!parsedLines.success) malformed.push("forecast_lines");
        const lines = parsedLines.data ?? [];
        for (const item of items) {
          if (item.kind !== "PRODUCT" || !item.sku || !item.inventoryItemId) continue;
          const line = lines.find((l) => l.inventory_item_id === item.inventoryItemId);
          if (line) neededBySku[item.sku] = line.suggested_quantity;
        }
      }
    }
  }
  for (const item of items) if (item.kind === "PRODUCT" && item.sku) packBySku[item.sku] = item.packQuantity ?? 1;

  const marketRefs = items
    .filter((i) => i.kind === "PRODUCT" && i.sku)
    .map((i) => {
      const ref = market.find((m) => m.inventory_item_id === i.inventoryItemId);
      return {
        sku: i.sku!,
        reference_unit_price_minor: ref?.reference_unit_price_minor ?? null,
        // A per-usable-unit comparison metric in fractional minor units (like the market's
        // normalised price it is compared with), never an amount that is charged.
        candidate_unit_price_minor: i.unitPriceMinor / Math.max(1, i.packQuantity ?? 1),
        observed_at: ref?.observed_at ?? null,
        comparable: ref?.status === "AVAILABLE",
      };
    });

  // Prior orders for duplicate detection.
  const windowHours = mandate?.duplicate_window_hours ?? 0;
  const prior =
    windowHours > 0
      ? await tx
          .select({
            id: purchaseOrders.id,
            supplierId: purchaseOrders.supplierId,
            status: purchaseOrders.status,
            createdAt: purchaseOrders.createdAt,
          })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.organizationId, organizationId),
              eq(purchaseOrders.supplierId, po.supplierId),
              ne(purchaseOrders.id, po.id),
              inArray(purchaseOrders.status, [...COMMITTED_PO_STATUSES]),
              gte(purchaseOrders.createdAt, new Date(opts.now.getTime() - windowHours * 3_600_000)),
            ),
          )
      : [];
  const priorItems = prior.length
    ? await tx
        .select({ poId: purchaseOrderItems.purchaseOrderId, sku: purchaseOrderItems.sku })
        .from(purchaseOrderItems)
        .where(
          and(
            inArray(
              purchaseOrderItems.purchaseOrderId,
              prior.map((p) => p.id),
            ),
            eq(purchaseOrderItems.kind, "PRODUCT"),
          ),
        )
    : [];

  const catalog: CatalogEntry[] = catalogRows.map((c) => ({
    sku: c.sku,
    supplier_id: c.supplierId,
    category: c.category as ProductCategory,
    unit_price_minor: c.unitPriceMinor,
    recurring: c.recurring,
    quarantined: c.quarantined,
  }));

  const input: PolicyInput = {
    mandate,
    cart: cartFromRows(po, items),
    supplier: supplier
      ? { id: supplier.id, active: supplier.active, fee_terms: supplier.feeTerms, tax_rate_bps: supplier.taxRateBps }
      : null,
    catalog,
    budget: { limit_minor: account.limitMinor, spent_minor: account.spentMinor, reserved_minor: Math.max(0, reserved) },
    request_budget_limit_minor: requestLimit,
    needed_units_by_sku: neededBySku,
    pack_quantity_by_sku: packBySku,
    market: marketRefs,
    prior_orders: prior.map((p) => ({
      id: p.id,
      supplier_id: p.supplierId,
      status: p.status,
      created_at: p.createdAt.toISOString(),
      skus: priorItems.filter((i) => i.poId === p.id && i.sku).map((i) => i.sku!),
    })),
    quarantined_source_ids: [
      ...(supplier?.quarantined ? [supplier.id] : []),
      ...catalogRows.filter((c) => c.quarantined).map((c) => c.sku),
    ],
    now: opts.now,
    market_reference_max_age_hours: opts.marketMaxAgeHours,
  };

  return {
    result: failClosedOnMalformedFacts(evaluatePolicy(input), malformed),
    input,
    mandateId: mandate?.id ?? null,
    purchaseOrderId: po.id,
    requestId: po.requestId,
    stage: opts.stage,
    evaluatedAt: opts.now,
  };
}
