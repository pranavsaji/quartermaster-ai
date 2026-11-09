import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { COMMITTED_PO_STATUSES, type AnalyticsSummaryDto, type FindingType, type PolicyDecisionKind } from "@qm/contracts";
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

/** Business and security outcomes, computed from the system of record. */
export async function analyticsSummary(ctx: AppContext, organizationId: string): Promise<AnalyticsSummaryDto> {
  const now = ctx.now();
  const db = ctx.db;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
  const mandate = await getActiveMandateRow(db, organizationId);
  const account = await currentAccount(db, { organizationId, timeZone: org!.timezone, currency: org!.currency, weeklyLimitMinor: mandate?.weeklyBudgetMinor ?? 0, now, lock: false });

  const payments = await db.select().from(paymentAttempts).where(eq(paymentAttempts.organizationId, organizationId));
  const completed = payments.filter((p) => ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status));
  const pos = await db.select({ id: purchaseOrders.id, status: purchaseOrders.status, total: purchaseOrders.totalMinor }).from(purchaseOrders).where(eq(purchaseOrders.organizationId, organizationId));
  const requests = await db.select().from(purchaseRequests).where(eq(purchaseRequests.organizationId, organizationId));
  const findings = await db.select({ type: securityFindings.type }).from(securityFindings).where(eq(securityFindings.organizationId, organizationId));
  const decisions = await db.select({ decision: policyDecisions.decision, stage: policyDecisions.stage }).from(policyDecisions).where(eq(policyDecisions.organizationId, organizationId));
  const dels = await db.select({ status: deliveries.status }).from(deliveries).where(eq(deliveries.organizationId, organizationId));
  const inventory = await listInventory(db, organizationId, now);

  // Duplicate captures: more than one completed capture for the same purchase order. Should be 0.
  const capturesByPo = new Map<string, number>();
  for (const p of completed) capturesByPo.set(p.purchaseOrderId, (capturesByPo.get(p.purchaseOrderId) ?? 0) + 1);
  const duplicateCaptures = [...capturesByPo.values()].filter((n) => n > 1).reduce((a, n) => a + n - 1, 0);

  const since = new Date(now.getTime() - 56 * 86_400_000).toISOString().slice(0, 10);
  const weeks = await db.select().from(budgetAccounts).where(and(eq(budgetAccounts.organizationId, organizationId), gte(budgetAccounts.periodStart, since))).orderBy(budgetAccounts.periodStart);

  const paidPoIds = completed.map((p) => p.purchaseOrderId);
  const categoryRows = paidPoIds.length
    ? await db
        .select({ category: purchaseOrderItems.category, total: sql<number>`sum(${purchaseOrderItems.lineTotalMinor})::bigint` })
        .from(purchaseOrderItems)
        .where(and(inArray(purchaseOrderItems.purchaseOrderId, paidPoIds), eq(purchaseOrderItems.kind, "PRODUCT")))
        .groupBy(purchaseOrderItems.category)
    : [];

  const count = <T extends string>(values: T[]) => {
    const m = new Map<T, number>();
    for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const decisionCounts = count(decisions.filter((d) => d.stage === "EVALUATE").map((d) => d.decision as PolicyDecisionKind));
  const findingCounts = count(findings.map((f) => f.type as FindingType));

  // Procurement time: request creation to payment completion.
  const durations: number[] = [];
  for (const p of completed) {
    const po = await db.select({ requestId: purchaseOrders.requestId }).from(purchaseOrders).where(eq(purchaseOrders.id, p.purchaseOrderId));
    const req = requests.find((r) => r.id === po[0]?.requestId);
    if (req && p.completedAt) durations.push(p.completedAt.getTime() - req.createdAt.getTime());
  }

  return {
    currency: org!.currency,
    budget: toBudgetDto(account),
    totals: {
      approved_spend_minor: pos.filter((p) => (COMMITTED_PO_STATUSES as readonly string[]).includes(p.status)).reduce((a, p) => a + p.total, 0),
      captured_spend_minor: completed.reduce((a, p) => a + (p.capturedAmountMinor ?? 0), 0),
      refunded_minor: completed.reduce((a, p) => a + p.refundedAmountMinor, 0),
      orders_paid: pos.filter((p) => p.status === "PAID" || p.status === "FULFILLED").length,
      orders_blocked: pos.filter((p) => p.status === "BLOCKED").length,
      pending_approvals: pos.filter((p) => p.status === "PROPOSED").length,
      requests_total: requests.length,
    },
    security: {
      findings_total: findings.length,
      blocked_attempts: decisions.filter((d) => d.decision === "BLOCK").length,
      prompt_injections_detected: findingCounts.get("PROMPT_INJECTION") ?? 0,
      duplicate_invoices_flagged: findingCounts.get("DUPLICATE_INVOICE") ?? 0,
      duplicate_captures: duplicateCaptures,
    },
    inventory: {
      items_low: inventory.filter((i) => i.status === "LOW").length,
      items_critical: inventory.filter((i) => i.status === "CRITICAL").length,
      items_out: inventory.filter((i) => i.status === "OUT").length,
    },
    deliveries: {
      scheduled: dels.filter((d) => d.status === "SCHEDULED" || d.status === "IN_TRANSIT").length,
      delayed: dels.filter((d) => d.status === "DELAYED").length,
      delivered: dels.filter((d) => d.status === "DELIVERED").length,
    },
    spend_by_week: weeks.map((w) => ({ week_start: w.periodStart, captured_minor: w.spentMinor, reserved_minor: w.reservedMinor })),
    spend_by_category: categoryRows.map((c) => ({ category: c.category ?? "uncategorized", captured_minor: Number(c.total) })),
    decisions_by_kind: (["ALLOW", "REVIEW_REQUIRED", "BLOCK"] as PolicyDecisionKind[]).map((d) => ({ decision: d, count: decisionCounts.get(d) ?? 0 })),
    findings_by_type: [...findingCounts.entries()].map(([type, c]) => ({ type, count: c })),
    procurement_time_ms: { median: percentile(durations, 0.5), p90: percentile(durations, 0.9) },
  };
}
