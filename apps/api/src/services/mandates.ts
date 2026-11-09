import { and, eq, inArray } from "drizzle-orm";
import type { ProductCategory, SpendMandateDto, SpendMandateInput } from "@qm/contracts";
import {
  budgetAccounts,
  intentCertificates,
  organizations,
  paymentAttempts,
  purchaseOrders,
  purchaseRequests,
  spendMandates,
  suppliers,
  type DbOrTx,
} from "@qm/database";
import { mandateTightened, type SpendMandate } from "@qm/trustrail";
import { badRequest, conflict, notFound } from "../errors";
import { appendAudit } from "./audit";
import { budgetPeriod, releaseReservation } from "./budget";

export type MandateRow = typeof spendMandates.$inferSelect;

export function rowToMandate(r: MandateRow): SpendMandate {
  return {
    id: r.id,
    organization_id: r.organizationId,
    version: r.version,
    status: r.status,
    currency: r.currency,
    weekly_budget_minor: r.weeklyBudgetMinor,
    per_order_limit_minor: r.perOrderLimitMinor,
    auto_approval_limit_minor: r.autoApprovalLimitMinor,
    human_approval_required: r.humanApprovalRequired,
    approved_supplier_ids: r.approvedSupplierIds,
    allowed_categories: r.allowedCategories as ProductCategory[],
    max_market_price_premium_pct: r.maxMarketPricePremiumPct,
    market_price_action: r.marketPriceAction,
    duplicate_window_hours: r.duplicateWindowHours,
    duplicate_action: r.duplicateAction,
    subscriptions_allowed: r.subscriptionsAllowed,
    certificate_ttl_minutes: r.certificateTtlMinutes,
    max_quantity_multiple_of_need: r.maxQuantityMultipleOfNeed,
  };
}

export function toMandateDto(r: MandateRow): SpendMandateDto {
  const m = rowToMandate(r);
  return {
    id: m.id,
    version: m.version,
    status: m.status,
    currency: m.currency,
    weekly_budget_minor: m.weekly_budget_minor,
    per_order_limit_minor: m.per_order_limit_minor,
    auto_approval_limit_minor: m.auto_approval_limit_minor,
    human_approval_required: true,
    approved_supplier_ids: m.approved_supplier_ids,
    allowed_categories: m.allowed_categories,
    max_market_price_premium_pct: m.max_market_price_premium_pct,
    market_price_action: m.market_price_action,
    duplicate_window_hours: m.duplicate_window_hours,
    duplicate_action: m.duplicate_action,
    subscriptions_allowed: m.subscriptions_allowed,
    certificate_ttl_minutes: m.certificate_ttl_minutes,
    max_quantity_multiple_of_need: m.max_quantity_multiple_of_need,
    created_by: r.createdBy,
    created_at: r.createdAt.toISOString(),
  };
}

export async function getActiveMandateRow(db: DbOrTx, organizationId: string, lock = false): Promise<MandateRow | null> {
  const q = db.select().from(spendMandates).where(and(eq(spendMandates.organizationId, organizationId), eq(spendMandates.status, "ACTIVE")));
  const [row] = lock ? await q.for("update") : await q;
  return row ?? null;
}

/** Statuses of a payment that has not yet reached PayPal capture; safe to invalidate. */
const PRE_CAPTURE = ["CREATED", "ORDER_CREATED", "PAYER_APPROVED"];

/**
 * Creates a new mandate version (mandates are immutable once issued). If the change tightens
 * the policy, outstanding approvals issued under older versions are revoked and their budget
 * reservations released, so they must be re-evaluated and re-approved.
 */
export async function updateMandate(
  tx: DbOrTx,
  args: { organizationId: string; userId: string; input: SpendMandateInput; now: Date },
): Promise<{ mandate: MandateRow; revokedCertificates: number }> {
  const current = await getActiveMandateRow(tx, args.organizationId, true);
  if (!current) throw notFound("Active Spend Mandate");
  if (current.version !== args.input.expected_version) {
    throw conflict("MANDATE_VERSION_CONFLICT", `The mandate was changed by someone else (now v${current.version}). Reload and try again.`, {
      current_version: current.version,
    });
  }
  const supplierIds = [...new Set(args.input.approved_supplier_ids)];
  if (supplierIds.length) {
    const found = await tx
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.organizationId, args.organizationId), inArray(suppliers.id, supplierIds)));
    if (found.length !== supplierIds.length) throw badRequest("Approved suppliers must belong to this organization");
  }

  await tx.update(spendMandates).set({ status: "SUPERSEDED" }).where(eq(spendMandates.id, current.id));
  const [next] = await tx
    .insert(spendMandates)
    .values({
      organizationId: args.organizationId,
      version: current.version + 1,
      status: "ACTIVE",
      currency: args.input.currency,
      weeklyBudgetMinor: args.input.weekly_budget_minor,
      perOrderLimitMinor: args.input.per_order_limit_minor,
      autoApprovalLimitMinor: args.input.auto_approval_limit_minor,
      humanApprovalRequired: true,
      approvedSupplierIds: supplierIds,
      allowedCategories: [...new Set(args.input.allowed_categories)],
      maxMarketPricePremiumPct: args.input.max_market_price_premium_pct,
      marketPriceAction: args.input.market_price_action,
      duplicateWindowHours: args.input.duplicate_window_hours,
      duplicateAction: args.input.duplicate_action,
      subscriptionsAllowed: args.input.subscriptions_allowed,
      certificateTtlMinutes: args.input.certificate_ttl_minutes,
      maxQuantityMultipleOfNeed: args.input.max_quantity_multiple_of_need,
      createdBy: args.userId,
    })
    .returning();

  // Keep the current week's budget account in step with the new weekly limit.
  const [org] = await tx.select().from(organizations).where(eq(organizations.id, args.organizationId));
  const period = budgetPeriod(args.now, org!.timezone);
  await tx
    .update(budgetAccounts)
    .set({ limitMinor: next!.weeklyBudgetMinor, updatedAt: args.now })
    .where(and(eq(budgetAccounts.organizationId, args.organizationId), eq(budgetAccounts.periodStart, period.start)));

  let revoked = 0;
  const tightened = mandateTightened(rowToMandate(current), rowToMandate(next!));
  if (tightened) {
    const active = await tx
      .select({ cert: intentCertificates, paymentStatus: paymentAttempts.status })
      .from(intentCertificates)
      .leftJoin(paymentAttempts, eq(paymentAttempts.intentId, intentCertificates.id))
      .where(and(eq(intentCertificates.organizationId, args.organizationId), eq(intentCertificates.status, "ACTIVE")));
    for (const { cert, paymentStatus } of active) {
      if (paymentStatus && !PRE_CAPTURE.includes(paymentStatus)) continue;
      await tx.update(intentCertificates).set({ status: "REVOKED", revokedReason: `MANDATE_CHANGED: superseded by v${next!.version}` }).where(eq(intentCertificates.id, cert.id));
      await releaseReservation(tx, cert.id, "MANDATE_CHANGED", args.now);
      await tx.update(purchaseOrders).set({ status: "PROPOSED", updatedAt: args.now }).where(eq(purchaseOrders.id, cert.purchaseOrderId));
      const [po] = await tx.select({ requestId: purchaseOrders.requestId }).from(purchaseOrders).where(eq(purchaseOrders.id, cert.purchaseOrderId));
      if (po?.requestId) await tx.update(purchaseRequests).set({ status: "READY_FOR_REVIEW", updatedAt: args.now }).where(eq(purchaseRequests.id, po.requestId));
      if (paymentStatus) await tx.update(paymentAttempts).set({ status: "VOIDED", failureCode: "MANDATE_CHANGED", updatedAt: args.now }).where(eq(paymentAttempts.intentId, cert.id));
      await appendAudit(tx, {
        organizationId: args.organizationId,
        action: "certificate.revoked",
        actorType: "SYSTEM",
        entityType: "intent_certificate",
        entityId: cert.id,
        data: { reason: "MANDATE_CHANGED", mandate_version: next!.version },
      });
      revoked++;
    }
  }

  await appendAudit(tx, {
    organizationId: args.organizationId,
    action: "mandate.updated",
    actorType: "USER",
    actorId: args.userId,
    entityType: "spend_mandate",
    entityId: next!.id,
    data: { from_version: current.version, to_version: next!.version, tightened, revoked_certificates: revoked, mandate: toMandateDto(next!) },
  });

  return { mandate: next!, revokedCertificates: revoked };
}
