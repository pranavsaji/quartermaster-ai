import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  SETTLED_PAYMENT_STATUSES,
  isCommittedOrder,
  type AnalyticsSummaryDto,
  type FindingType,
  type PolicyDecisionKind,
} from "@qm/contracts";
import {
  budgetAccounts,
  deliveries,
  organizations,
  paymentAttempts,
  policyDecisions,
  purchaseOrderItems,
  purchaseOrders,
  purchaseRequests,
  securityFindings,
  suppliers,
} from "@qm/database";
import type { AppContext } from "../context";
import { currentAccount, toBudgetDto } from "./budget";
import { listInventory } from "./inventory";
import { getActiveMandateRow } from "./mandates";

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(p * v.length))]!;
}

/**
 * Converts a PostgreSQL `bigint` sum of minor units (delivered as a string) to a number. A sum
 * beyond 2^53 cannot be represented exactly; that is a data error, not a rounding question.
 */
export function minorSum(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(n)) throw new Error(`Aggregate of minor units is not a safe integer: ${String(value)}`);
  return n;
}

/**
 * Per-process cache of each organisation's summary for ANALYTICS_CACHE_SECONDS (wall-clock), so a
 * dashboard polled by several tabs runs the aggregate queries once. Bounded: the oldest entry is
 * evicted first.
 */
const summaryCache = new Map<string, { expiresAt: number; value: Promise<AnalyticsSummaryDto> }>();
const SUMMARY_CACHE_MAX = 500;

/** Drops cached summaries (all, or one organisation's). */
export function clearAnalyticsCache(organizationId?: string): void {
  if (organizationId) summaryCache.delete(organizationId);
  else summaryCache.clear();
}

/** Business and security outcomes, computed from the system of record (cached briefly per organisation). */
export async function analyticsSummary(ctx: AppContext, organizationId: string): Promise<AnalyticsSummaryDto> {
  const ttlMs = ctx.config.analyticsCacheSeconds * 1000;
  if (ttlMs <= 0) return computeAnalyticsSummary(ctx, organizationId);
  const hit = summaryCache.get(organizationId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  // Concurrent requests share one computation; a failure is not cached.
  const value = computeAnalyticsSummary(ctx, organizationId);
  summaryCache.delete(organizationId);
  summaryCache.set(organizationId, { expiresAt: Date.now() + ttlMs, value });
  if (summaryCache.size > SUMMARY_CACHE_MAX) summaryCache.delete(summaryCache.keys().next().value!);
  value.catch(() => {
    if (summaryCache.get(organizationId)?.value === value) summaryCache.delete(organizationId);
  });
  return value;
}

async function computeAnalyticsSummary(ctx: AppContext, organizationId: string): Promise<AnalyticsSummaryDto> {
  const now = ctx.now();
  const db = ctx.db;
  const [[org], mandate] = await Promise.all([
    db.select().from(organizations).where(eq(organizations.id, organizationId)),
    getActiveMandateRow(db, organizationId),
  ]);

  // Every figure is an aggregate computed in PostgreSQL: the cost does not grow with history
  // loaded into the API process. Sums of minor units are `bigint` in PostgreSQL, which the driver
  // returns as a string (it may exceed 2^53), so they are typed as strings and converted with
  // `minorSum`; counts are cast to `int`, which arrives as a number.
  const settled = inArray(paymentAttempts.status, [...SETTLED_PAYMENT_STATUSES]);
  // The reads are independent, so they run concurrently. The budget account comes first within its
  // own chain: reading it may open the current week's row, which the weekly series then includes.
  const since = new Date(now.getTime() - 56 * 86_400_000).toISOString().slice(0, 10);
  const accountAndWeeks = (async () => {
    const account = await currentAccount(db, {
      organizationId,
      timeZone: org!.timezone,
      currency: org!.currency,
      weeklyLimitMinor: mandate?.weeklyBudgetMinor ?? 0,
      now,
      lock: false,
    });
    const weeks = await db
      .select()
      .from(budgetAccounts)
      .where(and(eq(budgetAccounts.organizationId, organizationId), gte(budgetAccounts.periodStart, since)))
      .orderBy(budgetAccounts.periodStart);
    return { account, weeks };
  })();
  const paymentTotalsQuery = db
    .select({
      captured: sql<string>`coalesce(sum(${paymentAttempts.capturedAmountMinor}), 0)::bigint`,
      refunded: sql<string>`coalesce(sum(${paymentAttempts.refundedAmountMinor}), 0)::bigint`,
      // More than one settled payment for the same purchase order would be a double charge.
      duplicateCaptures: sql<number>`(count(*) - count(distinct ${paymentAttempts.purchaseOrderId}))::int`,
    })
    .from(paymentAttempts)
    .where(and(eq(paymentAttempts.organizationId, organizationId), settled));
  const poByStatusQuery = db
    .select({
      status: purchaseOrders.status,
      n: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${purchaseOrders.totalMinor}), 0)::bigint`,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.organizationId, organizationId))
    .groupBy(purchaseOrders.status);
  const requestCountQuery = db
    .select({ n: sql<number>`count(*)::int` })
    .from(purchaseRequests)
    .where(eq(purchaseRequests.organizationId, organizationId));
  const findingRowsQuery = db
    .select({ type: securityFindings.type, n: sql<number>`count(*)::int` })
    .from(securityFindings)
    .where(eq(securityFindings.organizationId, organizationId))
    .groupBy(securityFindings.type);
  const decisionRowsQuery = db
    .select({ decision: policyDecisions.decision, stage: policyDecisions.stage, n: sql<number>`count(*)::int` })
    .from(policyDecisions)
    .where(eq(policyDecisions.organizationId, organizationId))
    .groupBy(policyDecisions.decision, policyDecisions.stage);
  const deliveryRowsQuery = db
    .select({ status: deliveries.status, n: sql<number>`count(*)::int` })
    .from(deliveries)
    .where(eq(deliveries.organizationId, organizationId))
    .groupBy(deliveries.status);

  const categoryRowsQuery = db
    .select({ category: purchaseOrderItems.category, total: sql<string>`coalesce(sum(${purchaseOrderItems.lineTotalMinor}), 0)::bigint` })
    .from(purchaseOrderItems)
    .innerJoin(paymentAttempts, eq(paymentAttempts.purchaseOrderId, purchaseOrderItems.purchaseOrderId))
    .where(and(eq(paymentAttempts.organizationId, organizationId), settled, eq(purchaseOrderItems.kind, "PRODUCT")))
    .groupBy(purchaseOrderItems.category);

  // Captured spend (net of refunds) per supplier, largest first.
  const supplierRowsQuery = db
    .select({
      supplier: suppliers.name,
      total: sql<string>`coalesce(sum(coalesce(${paymentAttempts.capturedAmountMinor}, 0) - ${paymentAttempts.refundedAmountMinor}), 0)::bigint`,
      orders: sql<number>`count(*)::int`,
    })
    .from(paymentAttempts)
    .innerJoin(purchaseOrders, eq(purchaseOrders.id, paymentAttempts.purchaseOrderId))
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .where(and(eq(paymentAttempts.organizationId, organizationId), settled))
    .groupBy(suppliers.name);

  // Procurement time: request creation to payment completion, in one joined query.
  const durationRowsQuery = db
    .select({ ms: sql<number>`(extract(epoch from (${paymentAttempts.completedAt} - ${purchaseRequests.createdAt})) * 1000)::float8` })
    .from(paymentAttempts)
    .innerJoin(purchaseOrders, eq(purchaseOrders.id, paymentAttempts.purchaseOrderId))
    .innerJoin(purchaseRequests, eq(purchaseRequests.id, purchaseOrders.requestId))
    .where(and(eq(paymentAttempts.organizationId, organizationId), settled, isNotNull(paymentAttempts.completedAt)));

  const [
    { account, weeks },
    [paymentTotals],
    poByStatus,
    [requestCount],
    findingRows,
    decisionRows,
    deliveryRows,
    inventory,
    categoryRows,
    supplierRows,
    durationRows,
  ] = await Promise.all([
    accountAndWeeks,
    paymentTotalsQuery,
    poByStatusQuery,
    requestCountQuery,
    findingRowsQuery,
    decisionRowsQuery,
    deliveryRowsQuery,
    listInventory(db, organizationId, now),
    categoryRowsQuery,
    supplierRowsQuery,
    durationRowsQuery,
  ]);
  const durations = durationRows.map((d) => Math.round(Number(d.ms)));

  const poCount = (statuses: readonly string[]) => poByStatus.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + r.n, 0);
  const deliveryCount = (statuses: readonly string[]) =>
    deliveryRows.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + r.n, 0);
  const findingCounts = new Map(findingRows.map((f) => [f.type as FindingType, f.n]));
  const evaluateDecision = (d: PolicyDecisionKind) =>
    decisionRows.filter((r) => r.stage === "EVALUATE" && r.decision === d).reduce((a, r) => a + r.n, 0);

  return {
    currency: org!.currency,
    budget: toBudgetDto(account),
    totals: {
      approved_spend_minor: poByStatus.filter((r) => isCommittedOrder(r.status)).reduce((a, r) => a + minorSum(r.total), 0),
      captured_spend_minor: minorSum(paymentTotals?.captured),
      refunded_minor: minorSum(paymentTotals?.refunded),
      orders_paid: poCount(["PAID", "FULFILLED"]),
      orders_blocked: poCount(["BLOCKED"]),
      pending_approvals: poCount(["PROPOSED"]),
      requests_total: requestCount?.n ?? 0,
    },
    security: {
      findings_total: findingRows.reduce((a, f) => a + f.n, 0),
      blocked_attempts: decisionRows.filter((r) => r.decision === "BLOCK").reduce((a, r) => a + r.n, 0),
      prompt_injections_detected: findingCounts.get("PROMPT_INJECTION") ?? 0,
      duplicate_invoices_flagged: findingCounts.get("DUPLICATE_INVOICE") ?? 0,
      duplicate_captures: paymentTotals?.duplicateCaptures ?? 0,
    },
    inventory: {
      items_low: inventory.filter((i) => i.status === "LOW").length,
      items_critical: inventory.filter((i) => i.status === "CRITICAL").length,
      items_out: inventory.filter((i) => i.status === "OUT").length,
    },
    deliveries: {
      scheduled: deliveryCount(["SCHEDULED", "IN_TRANSIT"]),
      delayed: deliveryCount(["DELAYED"]),
      delivered: deliveryCount(["DELIVERED"]),
    },
    spend_by_week: weeks.map((w) => ({ week_start: w.periodStart, captured_minor: w.spentMinor, reserved_minor: w.reservedMinor })),
    spend_by_supplier: supplierRows
      .map((r) => ({ supplier: r.supplier, captured_minor: minorSum(r.total), orders: r.orders }))
      .sort((a, b) => b.captured_minor - a.captured_minor),
    spend_by_category: categoryRows.map((c) => ({ category: c.category ?? "uncategorized", captured_minor: minorSum(c.total) })),
    decisions_by_kind: (["ALLOW", "REVIEW_REQUIRED", "BLOCK"] as PolicyDecisionKind[]).map((d) => ({
      decision: d,
      count: evaluateDecision(d),
    })),
    findings_by_type: [...findingCounts.entries()].map(([type, c]) => ({ type, count: c })),
    procurement_time_ms: { median: percentile(durations, 0.5), p90: percentile(durations, 0.9) },
  };
}
