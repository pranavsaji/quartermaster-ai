import { and, eq, gte, inArray, ne } from "drizzle-orm";
import type { ForecastLineDto, MarketReferenceDto, ProductCategory } from "@qm/contracts";
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
import { evaluatePolicy, type CatalogEntry, type PolicyInput, type PolicyResult } from "@qm/trustrail";
import { currentAccount } from "./budget";
import { getActiveMandateRow, rowToMandate } from "./mandates";
import { cartFromRows, type PurchaseOrderItemRow, type PurchaseOrderRow } from "./orders";
import { loadCatalogForSupplier } from "./suppliers";

const COMMITTED_STATUSES = ["APPROVED", "PAYMENT_PENDING", "PAID", "FULFILLED"];

export interface EvaluateOptions {
  stage: "EVALUATE" | "APPROVE" | "CAPTURE";
  now: Date;
  /** Lock the budget account row (approval path). */
  lockBudget?: boolean;
  /** At capture time the order's own reservation is already counted; exclude it. */
  excludeOwnReservationForIntent?: string | null;
  marketMaxAgeHours: number;
}

/**
 * Gathers every fact TrustRail needs from the system of record (never from the agent) and runs
 * the deterministic policy. The decision is persisted with a digest of its inputs.
 */
export async function evaluateOrder(
  tx: DbOrTx,
  organizationId: string,
  po: PurchaseOrderRow,
  items: PurchaseOrderItemRow[],
  opts: EvaluateOptions,
): Promise<{ result: PolicyResult; decisionId: string; mandateId: string | null; input: PolicyInput }> {
  const mandateRow = await getActiveMandateRow(tx, organizationId);
  const mandate = mandateRow ? rowToMandate(mandateRow) : null;
  const [org] = await tx.select().from(organizations).where(eq(organizations.id, organizationId));
  const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, po.supplierId), eq(suppliers.organizationId, organizationId)));
  const catalogRows = await loadCatalogForSupplier(tx, organizationId, po.supplierId);

  const account = await currentAccount(tx, {
    organizationId,
    timeZone: org!.timezone,
    currency: org!.currency,
    weeklyLimitMinor: mandate?.weekly_budget_minor ?? 0,
    now: opts.now,
    lock: !!opts.lockBudget,
  });
  let reserved = account.reservedMinor;
  if (opts.excludeOwnReservationForIntent) {
    const [own] = await tx
      .select()
      .from(budgetReservations)
      .where(and(eq(budgetReservations.intentId, opts.excludeOwnReservationForIntent), eq(budgetReservations.status, "ACTIVE"), eq(budgetReservations.budgetAccountId, account.id)));
    if (own) reserved -= own.amountMinor;
  }

  // Request-level facts: owner's budget cap (net of other committed orders), forecast need and market evidence.
  let requestLimit: number | null = null;
  const neededBySku: Record<string, number> = {};
  const packBySku: Record<string, number> = {};
  let market: MarketReferenceDto[] = [];
  if (po.requestId) {
    const [req] = await tx.select().from(purchaseRequests).where(eq(purchaseRequests.id, po.requestId));
    if (req) {
      market = (req.market as MarketReferenceDto[]) ?? [];
      const intentBudget = (req.intent as { budget_limit_minor?: number | null } | null)?.budget_limit_minor ?? null;
      const cap = req.budgetLimitMinor ?? intentBudget;
      if (cap !== null && cap !== undefined) {
        const others = await tx
          .select({ total: purchaseOrders.totalMinor })
          .from(purchaseOrders)
          .where(and(eq(purchaseOrders.requestId, req.id), ne(purchaseOrders.id, po.id), inArray(purchaseOrders.status, COMMITTED_STATUSES)));
        requestLimit = cap - others.reduce((a, o) => a + o.total, 0);
      }
      if (req.forecastRunId) {
        const [run] = await tx.select().from(forecastRuns).where(eq(forecastRuns.id, req.forecastRunId));
        const lines = (run?.lines ?? []) as ForecastLineDto[];
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
          .select({ id: purchaseOrders.id, supplierId: purchaseOrders.supplierId, status: purchaseOrders.status, createdAt: purchaseOrders.createdAt })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.organizationId, organizationId),
              eq(purchaseOrders.supplierId, po.supplierId),
              ne(purchaseOrders.id, po.id),
              inArray(purchaseOrders.status, COMMITTED_STATUSES),
              gte(purchaseOrders.createdAt, new Date(opts.now.getTime() - windowHours * 3_600_000)),
            ),
          )
      : [];
  const priorItems = prior.length
    ? await tx
        .select({ poId: purchaseOrderItems.purchaseOrderId, sku: purchaseOrderItems.sku })
        .from(purchaseOrderItems)
        .where(and(inArray(purchaseOrderItems.purchaseOrderId, prior.map((p) => p.id)), eq(purchaseOrderItems.kind, "PRODUCT")))
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
    supplier: supplier ? { id: supplier.id, active: supplier.active, fee_terms: supplier.feeTerms, tax_rate_bps: supplier.taxRateBps } : null,
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

  const result = evaluatePolicy(input);
  const [row] = await tx
    .insert(policyDecisions)
    .values({
      organizationId,
      purchaseOrderId: po.id,
      requestId: po.requestId,
      stage: opts.stage,
      decision: result.decision,
      violations: result.violations,
      checks: result.checks,
      humanApprovalRequired: result.human_approval_required,
      mandateId: mandate?.id ?? null,
      mandateVersion: result.mandate_version,
      policyVersion: result.policy_version,
      inputDigest: result.input_digest,
      createdAt: opts.now,
    })
    .returning({ id: policyDecisions.id });
  return { result, decisionId: row!.id, mandateId: mandate?.id ?? null, input };
}
