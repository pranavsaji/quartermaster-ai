import { and, eq, sql } from "drizzle-orm";
import { budgetAccounts, budgetReservations, organizations, type DbOrTx } from "@qm/database";
import type { BudgetDto } from "@qm/contracts";
import type { AppContext } from "../context";
import { conflict, notFound } from "../errors";

/** Local calendar date (YYYY-MM-DD) and ISO weekday (1 = Monday) in a time zone. */
export function localDate(now: Date, timeZone: string): { date: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdays[get("weekday")] ?? 1 };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Budget weeks run Monday–Sunday in the organization's time zone. */
export function budgetPeriod(now: Date, timeZone: string): { start: string; end: string } {
  const { date, weekday } = localDate(now, timeZone);
  const start = addDays(date, -(weekday - 1));
  return { start, end: addDays(start, 6) };
}

export type BudgetAccountRow = typeof budgetAccounts.$inferSelect;

/**
 * Returns the current period's budget account, creating it if needed. With `lock`, the row is
 * locked FOR UPDATE for the remainder of the transaction, which serialises concurrent
 * reservations so two agents can never both spend the same remaining funds.
 */
export async function currentAccount(
  tx: DbOrTx,
  args: { organizationId: string; timeZone: string; currency: string; weeklyLimitMinor: number; now: Date; lock: boolean },
): Promise<BudgetAccountRow> {
  const period = budgetPeriod(args.now, args.timeZone);
  await tx
    .insert(budgetAccounts)
    .values({
      organizationId: args.organizationId,
      periodStart: period.start,
      periodEnd: period.end,
      currency: args.currency,
      limitMinor: args.weeklyLimitMinor,
    })
    .onConflictDoNothing({ target: [budgetAccounts.organizationId, budgetAccounts.periodStart] });
  const q = tx
    .select()
    .from(budgetAccounts)
    .where(and(eq(budgetAccounts.organizationId, args.organizationId), eq(budgetAccounts.periodStart, period.start)));
  const [row] = args.lock ? await q.for("update") : await q;
  return row!;
}

export function remaining(account: Pick<BudgetAccountRow, "limitMinor" | "reservedMinor" | "spentMinor">): number {
  return account.limitMinor - account.reservedMinor - account.spentMinor;
}

export function toBudgetDto(a: BudgetAccountRow): BudgetDto {
  return {
    period_start: a.periodStart,
    period_end: a.periodEnd,
    currency: a.currency,
    limit_minor: a.limitMinor,
    reserved_minor: a.reservedMinor,
    spent_minor: a.spentMinor,
    remaining_minor: Math.max(0, remaining(a)),
  };
}

/** Reserves spending capacity. Must run inside a transaction holding the account lock. */
export async function reserve(
  tx: DbOrTx,
  account: BudgetAccountRow,
  args: { organizationId: string; intentId: string; purchaseOrderId: string; amountMinor: number; now: Date },
): Promise<typeof budgetReservations.$inferSelect> {
  if (args.amountMinor <= 0) throw conflict("INVALID_RESERVATION", "Reservation amount must be positive");
  if (args.amountMinor > remaining(account)) {
    throw conflict("BUDGET_EXHAUSTED", "The remaining weekly budget cannot cover this purchase", {
      remaining_minor: Math.max(0, remaining(account)),
      requested_minor: args.amountMinor,
    });
  }
  const [updated] = await tx
    .update(budgetAccounts)
    .set({ reservedMinor: sql`${budgetAccounts.reservedMinor} + ${args.amountMinor}`, updatedAt: args.now })
    .where(and(eq(budgetAccounts.id, account.id), sql`${budgetAccounts.limitMinor} - ${budgetAccounts.reservedMinor} - ${budgetAccounts.spentMinor} >= ${args.amountMinor}`))
    .returning();
  // Defence in depth: the conditional update fails closed even if a caller forgot the lock.
  if (!updated) throw conflict("BUDGET_EXHAUSTED", "The remaining weekly budget cannot cover this purchase");
  const [reservation] = await tx
    .insert(budgetReservations)
    .values({
      organizationId: args.organizationId,
      budgetAccountId: account.id,
      intentId: args.intentId,
      purchaseOrderId: args.purchaseOrderId,
      amountMinor: args.amountMinor,
    })
    .returning();
  return reservation!;
}

/** Releases an ACTIVE reservation back to the budget. Idempotent. */
export async function releaseReservation(tx: DbOrTx, intentId: string, reason: string, now: Date): Promise<boolean> {
  const [r] = await tx
    .update(budgetReservations)
    .set({ status: "RELEASED", releaseReason: reason, releasedAt: now })
    .where(and(eq(budgetReservations.intentId, intentId), eq(budgetReservations.status, "ACTIVE")))
    .returning();
  if (!r) return false;
  await tx
    .update(budgetAccounts)
    .set({ reservedMinor: sql`greatest(0, ${budgetAccounts.reservedMinor} - ${r.amountMinor})`, updatedAt: now })
    .where(eq(budgetAccounts.id, r.budgetAccountId));
  return true;
}

/** Converts an ACTIVE reservation into spend at the captured amount. Idempotent. */
export async function consumeReservation(tx: DbOrTx, intentId: string, capturedMinor: number, now: Date): Promise<boolean> {
  const [r] = await tx
    .update(budgetReservations)
    .set({ status: "CONSUMED", consumedAt: now })
    .where(and(eq(budgetReservations.intentId, intentId), eq(budgetReservations.status, "ACTIVE")))
    .returning();
  if (!r) return false;
  await tx
    .update(budgetAccounts)
    .set({
      reservedMinor: sql`greatest(0, ${budgetAccounts.reservedMinor} - ${r.amountMinor})`,
      spentMinor: sql`${budgetAccounts.spentMinor} + ${capturedMinor}`,
      updatedAt: now,
    })
    .where(eq(budgetAccounts.id, r.budgetAccountId));
  return true;
}

/**
 * Records spend for a capture whose reservation had already been released (e.g. a late webhook
 * after the sweeper expired the intent). Money moved, so the budget must reflect it.
 */
export async function recordUnreservedSpend(tx: DbOrTx, intentId: string, capturedMinor: number, now: Date): Promise<void> {
  const [r] = await tx.select().from(budgetReservations).where(eq(budgetReservations.intentId, intentId));
  if (!r || r.status !== "RELEASED") return;
  await tx.update(budgetReservations).set({ status: "CONSUMED", consumedAt: now, releaseReason: `${r.releaseReason ?? ""} (later captured)` }).where(eq(budgetReservations.id, r.id));
  await tx
    .update(budgetAccounts)
    .set({ spentMinor: sql`${budgetAccounts.spentMinor} + ${capturedMinor}`, updatedAt: now })
    .where(eq(budgetAccounts.id, r.budgetAccountId));
}

export async function reduceSpend(tx: DbOrTx, intentId: string, refundedMinor: number, now: Date): Promise<void> {
  const [r] = await tx.select().from(budgetReservations).where(eq(budgetReservations.intentId, intentId));
  if (!r) return;
  await tx
    .update(budgetAccounts)
    .set({ spentMinor: sql`greatest(0, ${budgetAccounts.spentMinor} - ${refundedMinor})`, updatedAt: now })
    .where(eq(budgetAccounts.id, r.budgetAccountId));
}

/** The current week's budget for an organisation, without locking. */
export async function weeklyBudget(ctx: AppContext, organizationId: string, weeklyLimitMinor: number): Promise<BudgetDto> {
  const [org] = await ctx.db.select().from(organizations).where(eq(organizations.id, organizationId));
  if (!org) throw notFound("Organisation");
  return toBudgetDto(await currentAccount(ctx.db, { organizationId, timeZone: org.timezone, currency: org.currency, weeklyLimitMinor, now: ctx.now(), lock: false }));
}
