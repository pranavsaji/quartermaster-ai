import { PAYABLE_PO_STATUSES, isPreCapturePayment } from "@qm/contracts";
import { and, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  agentRuns,
  idempotencyKeys,
  intentCertificates,
  invitations,
  jobLeases,
  passwordResetTokens,
  paymentAttempts,
  paypalWebhookEvents,
  purchaseRequests,
  rateLimitHits,
  sessions,
  systemErrors,
  toolExecutions,
  type Database,
} from "@qm/database";
import type { AppContext } from "../context";
import { appendAudit } from "../services/audit";
import { retryOnConflict } from "../services/common";
import { releaseReservation } from "../services/budget";
import { setOrderStatus } from "../services/order-status";
import { runMonitors } from "../services/monitoring/status";
import { reconcilePayment, reconcileRefunds, transitionPayment, voidAbandonedCapture } from "../services/payments";

export interface SweepReport {
  reconciled: number;
  expired: number;
  researchRecovered: number;
  refundsReconciled: number;
  sessionsPurged: number;
  idempotencyPurged: number;
  /** Rows removed by the retention purge (RETENTION_DAYS). */
  retentionPurged: number;
  errors: number;
}

const INSTANCE_ID: string = randomUUID();
const LEASE_SECONDS = 120;
/** How long after voiding an attempt the sweeper keeps checking PayPal for a late capture. */
const LATE_CAPTURE_WINDOW_MS = 6 * 3_600_000;

/** Acquires (or renews) a time-bound lease. Works across pooled connections and instances. */
export async function acquireLease(db: Database, name: string, now: Date, holder = INSTANCE_ID): Promise<boolean> {
  const until = new Date(now.getTime() + LEASE_SECONDS * 1000);
  const rows = await db
    .insert(jobLeases)
    .values({ name, holder, leaseUntil: until })
    .onConflictDoUpdate({
      target: jobLeases.name,
      set: { holder, leaseUntil: until },
      setWhere: or(lt(jobLeases.leaseUntil, now), eq(jobLeases.holder, holder)),
    })
    .returning({ holder: jobLeases.holder });
  return rows[0]?.holder === holder;
}

export async function releaseLease(db: Database, name: string, holder = INSTANCE_ID): Promise<void> {
  await db.delete(jobLeases).where(and(eq(jobLeases.name, name), eq(jobLeases.holder, holder)));
}

/**
 * Background maintenance, safe to run from several instances (a lease row elects one runner):
 *  1. Reconcile payments stuck in an ambiguous state with PayPal.
 *  2. Expire unused certificates and release their budget reservations — but only after
 *     confirming with PayPal that no capture happened, so money that moved is always counted.
 *  3. Fail research runs abandoned by a crash or deploy, so the request can be researched again.
 *  4. Purge expired sessions and idempotency records.
 */
export async function sweep(ctx: AppContext): Promise<SweepReport> {
  const report: SweepReport = {
    reconciled: 0,
    expired: 0,
    researchRecovered: 0,
    refundsReconciled: 0,
    sessionsPurged: 0,
    idempotencyPurged: 0,
    retentionPurged: 0,
    errors: 0,
  };
  if (!(await acquireLease(ctx.db, "sweeper", ctx.now()))) return report;
  try {
    const now = ctx.now();

    if (ctx.paypal.configured) {
      const stuck = await ctx.db
        .select()
        .from(paymentAttempts)
        .where(
          and(
            isNotNull(paymentAttempts.paypalOrderId),
            // Skip rows reconciled very recently so a few unreachable orders cannot starve the rest.
            or(isNull(paymentAttempts.lastReconciledAt), lt(paymentAttempts.lastReconciledAt, new Date(now.getTime() - 2 * 60_000))),
            or(
              and(eq(paymentAttempts.status, "CAPTURE_PENDING"), lt(paymentAttempts.updatedAt, new Date(now.getTime() - 2 * 60_000))),
              and(
                inArray(paymentAttempts.status, ["ORDER_CREATED", "PAYER_APPROVED"]),
                lt(paymentAttempts.updatedAt, new Date(now.getTime() - 10 * 60_000)),
              ),
              // A voided or failed attempt can still be captured late (PayPal approvals live for
              // hours): keep checking recent ones so money that moved is always recorded.
              and(
                inArray(paymentAttempts.status, ["VOIDED", "FAILED"]),
                gt(paymentAttempts.updatedAt, new Date(now.getTime() - LATE_CAPTURE_WINDOW_MS)),
              ),
            ),
          ),
        )
        .orderBy(sql`${paymentAttempts.lastReconciledAt} asc nulls first`)
        .limit(50);
      for (const p of stuck) {
        try {
          await reconcilePayment(ctx, p.id);
          report.reconciled++;
        } catch (err) {
          report.errors++;
          ctx.log.warn({ err, payment_id: p.id }, "reconciliation failed");
        }
      }
    }

    if (!(await acquireLease(ctx.db, "sweeper", ctx.now()))) return report;
    const expired = await ctx.db
      .select({ cert: intentCertificates, payment: paymentAttempts })
      .from(intentCertificates)
      .leftJoin(paymentAttempts, eq(paymentAttempts.intentId, intentCertificates.id))
      .where(and(eq(intentCertificates.status, "ACTIVE"), lt(intentCertificates.expiresAt, now)))
      // Certificates whose payment PayPal was asked about least recently go first, so ones that keep
      // being skipped (a capture still pending) cannot starve the rest of the batch.
      .orderBy(sql`${paymentAttempts.lastReconciledAt} asc nulls first`, intentCertificates.expiresAt)
      .limit(100);
    for (const { cert, payment } of expired) {
      try {
        if (payment?.paypalOrderId) {
          if (!ctx.paypal.configured) continue; // cannot prove no capture happened; keep the hold
          let status = await reconcilePayment(ctx, payment.id);
          if (status === "CAPTURE_PENDING") {
            status = await voidAbandonedCapture(ctx, payment.id);
            if (status === "VOIDED") report.expired++;
          }
          if (status !== "CREATED" && status !== "ORDER_CREATED" && status !== "PAYER_APPROVED") continue;
        }
        // Lock order everywhere: payment, then certificate. Retried on deadlock (idempotent).
        const expiredNow = await retryOnConflict(ctx, "certificate.expire", () =>
          ctx.db.transaction(async (tx) => {
            if (payment) {
              const [locked] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, payment.id)).for("update");
              // A capture may have started since PayPal was checked: never release its reservation.
              if (locked && !isPreCapturePayment(locked.status)) return false;
              const [fresh] = await tx.select().from(intentCertificates).where(eq(intentCertificates.id, cert.id)).for("update");
              if (fresh?.status !== "ACTIVE") return false;
              if (locked) {
                await transitionPayment(
                  tx,
                  locked,
                  "VOIDED",
                  { failureCode: "CERTIFICATE_EXPIRED", failureMessage: "The approval expired before payment." },
                  now,
                );
              }
            } else {
              const [fresh] = await tx.select().from(intentCertificates).where(eq(intentCertificates.id, cert.id)).for("update");
              if (fresh?.status !== "ACTIVE") return false;
            }
            await tx.update(intentCertificates).set({ status: "EXPIRED" }).where(eq(intentCertificates.id, cert.id));
            await releaseReservation(tx, cert.id, "CERTIFICATE_EXPIRED", now);
            await setOrderStatus(tx, cert.purchaseOrderId, PAYABLE_PO_STATUSES, "EXPIRED", now);
            await appendAudit(tx, {
              organizationId: cert.organizationId,
              action: "certificate.expired",
              actorType: "SYSTEM",
              entityType: "intent_certificate",
              entityId: cert.id,
              data: { expired_at: cert.expiresAt, reservation_released: true },
            });
            return true;
          }),
        );
        if (!expiredNow) continue;
        report.expired++;
      } catch (err) {
        report.errors++;
        ctx.log.warn({ err, intent_id: cert.id }, "certificate expiry failed");
      }
    }

    // Long PayPal phases can outlast the lease: renew it, and stop if another runner took over.
    if (!(await acquireLease(ctx.db, "sweeper", ctx.now()))) return report;
    if (ctx.paypal.configured) {
      const refundsReport = await reconcileRefunds(ctx, now);
      report.refundsReconciled = refundsReport.examined;
      report.errors += refundsReport.errors;
    }

    report.researchRecovered = await recoverAbandonedResearch(ctx, now);

    const purgedSessions = await ctx.db
      .delete(sessions)
      .where(or(lt(sessions.expiresAt, now), lt(sessions.revokedAt, new Date(now.getTime() - 86_400_000))))
      .returning({ id: sessions.id });
    report.sessionsPurged = purgedSessions.length;
    const purgedKeys = await ctx.db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.createdAt, new Date(now.getTime() - 48 * 3_600_000)))
      .returning({ id: idempotencyKeys.id });
    report.idempotencyPurged = purgedKeys.length;
    // Rate-limit windows are timed by the database clock; anything past its reset is dead.
    await ctx.db.delete(rateLimitHits).where(lt(rateLimitHits.resetAt, sql`now() - interval '1 minute'`));

    try {
      const purged = await purgeExpiredRecords(ctx, now);
      report.retentionPurged = Object.values(purged).reduce((a, n) => a + n, 0);
    } catch (err) {
      report.errors++;
      ctx.log.warn({ err }, "retention purge failed");
    }

    try {
      await runMonitors(ctx);
    } catch (err) {
      report.errors++;
      await ctx.errors.capture({ source: "job", level: "error", code: "MONITORS_FAILED", message: "Health monitors failed to run", err });
    }
    if (report.errors > 0) {
      // Individual failures are retried next run; a group here shows how often that happens.
      await ctx.errors.capture({
        source: "job",
        level: "warning",
        code: "SWEEP_PARTIAL_FAILURE",
        message: "Some sweeper steps failed and will be retried",
        context: { errors: report.errors },
      });
    }
    await recordSweepSuccess(ctx);
  } finally {
    await releaseLease(ctx.db, "sweeper");
  }
  return report;
}

/* ------------------------------------------------------------ Retention */

export interface RetentionReport {
  webhookEvents: number;
  toolExecutions: number;
  systemErrors: number;
  invitations: number;
  passwordResets: number;
}

/** Rows deleted per table per sweep, so a first purge of a large backlog stays short. */
const PURGE_BATCH = 5000;

/**
 * Deletes operational records older than RETENTION_DAYS: processed or rejected PayPal webhook
 * events, agent tool steps (the run rows and their token counts stay), error groups not seen
 * since, and invitations and password-reset links that expired unused. Never touches audit
 * events, payments, orders, certificates or anything else that is evidence.
 */
export async function purgeExpiredRecords(ctx: AppContext, now: Date): Promise<RetentionReport> {
  const cutoff = new Date(now.getTime() - ctx.config.retentionDays * 86_400_000);
  const webhookEvents = await ctx.db
    .delete(paypalWebhookEvents)
    .where(
      inArray(
        paypalWebhookEvents.id,
        ctx.db
          .select({ id: paypalWebhookEvents.id })
          .from(paypalWebhookEvents)
          .where(lt(paypalWebhookEvents.receivedAt, cutoff))
          .limit(PURGE_BATCH),
      ),
    )
    .returning({ id: paypalWebhookEvents.id });
  const steps = await ctx.db
    .delete(toolExecutions)
    .where(
      inArray(
        toolExecutions.id,
        ctx.db.select({ id: toolExecutions.id }).from(toolExecutions).where(lt(toolExecutions.startedAt, cutoff)).limit(PURGE_BATCH),
      ),
    )
    .returning({ id: toolExecutions.id });
  const errorGroups = await ctx.db.delete(systemErrors).where(lt(systemErrors.lastSeenAt, cutoff)).returning({ id: systemErrors.id });
  const staleInvitations = await ctx.db
    .delete(invitations)
    .where(and(isNull(invitations.acceptedAt), lt(invitations.expiresAt, cutoff)))
    .returning({ id: invitations.id });
  const staleResets = await ctx.db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, cutoff))
    .returning({ id: passwordResetTokens.id });
  const report = {
    webhookEvents: webhookEvents.length,
    toolExecutions: steps.length,
    systemErrors: errorGroups.length,
    invitations: staleInvitations.length,
    passwordResets: staleResets.length,
  };
  if (Object.values(report).some((n) => n > 0))
    ctx.log.info({ retention: report, retention_days: ctx.config.retentionDays }, "retention purge");
  return report;
}

/* ------------------------------------------------------- Sweeper liveness */

/**
 * The last successful sweep is kept as a row in `job_leases` under its own name (the lease
 * mechanism only ever touches the `sweeper` row), so the API can tell when the sweeper, in-process
 * or a cron job, has stopped.
 */
const LAST_SWEEP = "sweeper:last_success";

async function recordSweepSuccess(ctx: AppContext): Promise<void> {
  const at = ctx.now();
  await ctx.db
    .insert(jobLeases)
    .values({ name: LAST_SWEEP, holder: INSTANCE_ID, leaseUntil: at })
    .onConflictDoUpdate({ target: jobLeases.name, set: { holder: INSTANCE_ID, leaseUntil: at } });
}

/** When the last sweep completed, or null if none has been recorded. */
export async function lastSweepAt(db: Database): Promise<Date | null> {
  const [row] = await db.select({ at: jobLeases.leaseUntil }).from(jobLeases).where(eq(jobLeases.name, LAST_SWEEP));
  return row?.at ?? null;
}

export type SweeperHealth = { status: "ok" | "stale" | "unknown" | "disabled"; last_sweep_age_seconds: number | null };

/**
 * Whether the sweeper is keeping up: `stale` once the last success is older than
 * SWEEPER_STALE_AFTER_SECONDS, `unknown` when none has been recorded yet.
 */
export async function sweeperHealth(ctx: AppContext): Promise<SweeperHealth> {
  const last = await lastSweepAt(ctx.db);
  const age = last ? Math.max(0, Math.floor((ctx.now().getTime() - last.getTime()) / 1000)) : null;
  const limit = ctx.config.sweeperStaleAfterSeconds;
  if (limit <= 0) return { status: "disabled", last_sweep_age_seconds: age };
  if (age === null) return { status: "unknown", last_sweep_age_seconds: null };
  return { status: age > limit ? "stale" : "ok", last_sweep_age_seconds: age };
}

export const SWEEPER_STALE_MONITOR = "monitor.sweeper_stale";

/**
 * One watchdog check: raises `monitor.sweeper_stale` while the last successful sweep is too old
 * (or none was ever recorded once `startedAt` is that old), and resolves it when sweeps resume.
 * Runs in the API process, so it still fires when the sweeper itself has stopped. Never throws.
 */
export async function checkSweeperLiveness(ctx: AppContext, startedAt: Date): Promise<SweeperHealth | null> {
  try {
    const health = await sweeperHealth(ctx);
    const limit = ctx.config.sweeperStaleAfterSeconds;
    const sinceStart = (ctx.now().getTime() - startedAt.getTime()) / 1000;
    const stale = health.status === "stale" || (health.status === "unknown" && sinceStart > limit);
    if (stale) {
      await ctx.errors.monitor(
        SWEEPER_STALE_MONITOR,
        "error",
        health.last_sweep_age_seconds === null
          ? `No sweep has completed since this API instance started over ${Math.round(limit / 60)} minutes ago. Payments are not being reconciled.`
          : `The last successful sweep was ${Math.round(health.last_sweep_age_seconds / 60)} minutes ago (limit ${Math.round(limit / 60)}). Payments are not being reconciled.`,
        { last_sweep_age_seconds: health.last_sweep_age_seconds, limit_seconds: limit },
      );
    } else if (health.status === "ok") {
      await ctx.errors.clearMonitor(SWEEPER_STALE_MONITOR);
    }
    return health;
  } catch (err) {
    ctx.log.warn({ err }, "sweeper liveness check failed");
    return null;
  }
}

/** Runs `checkSweeperLiveness` periodically in the API process (off when the limit is 0). */
export function startSweeperWatchdog(ctx: AppContext): SweeperHandle {
  const limit = ctx.config.sweeperStaleAfterSeconds;
  if (limit <= 0) return { stop: async () => {} };
  const startedAt = ctx.now();
  let current: Promise<unknown> | null = null;
  const timer = setInterval(
    () => {
      if (current) return;
      current = checkSweeperLiveness(ctx, startedAt).finally(() => (current = null));
    },
    Math.min(300, Math.max(30, Math.floor(limit / 3))) * 1000,
  );
  timer.unref();
  return {
    stop: async () => {
      clearInterval(timer);
      await current;
    },
  };
}

/**
 * Marks research runs as FAILED when they have been RESEARCHING far longer than the agent
 * deadline allows: the process running them died (crash or deploy). The owner can retry.
 */
export async function recoverAbandonedResearch(ctx: AppContext, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - Math.max(2 * ctx.config.agent.deadlineMs, 5 * 60_000));
  const stale = await ctx.db
    .update(purchaseRequests)
    .set({ status: "FAILED", error: "Research was interrupted. Run it again.", updatedAt: now })
    .where(
      and(
        eq(purchaseRequests.status, "RESEARCHING"),
        or(isNull(purchaseRequests.researchStartedAt), lt(purchaseRequests.researchStartedAt, cutoff)),
      ),
    )
    .returning({ id: purchaseRequests.id, organizationId: purchaseRequests.organizationId });
  for (const r of stale) {
    await ctx.db
      .update(agentRuns)
      .set({ status: "FAILED", error: "Interrupted", completedAt: now })
      .where(and(eq(agentRuns.requestId, r.id), eq(agentRuns.status, "RUNNING")));
    await appendAudit(ctx.db, {
      organizationId: r.organizationId,
      action: "procurement.research_recovered",
      actorType: "SYSTEM",
      entityType: "purchase_request",
      entityId: r.id,
      data: { reason: "STALE_RESEARCH" },
    });
  }
  if (stale.length > 0) ctx.log.warn({ count: stale.length }, "failed research runs abandoned by a previous process");
  return stale.length;
}

export interface SweeperHandle {
  /** Stops scheduling runs and resolves once any in-flight run has finished. */
  stop(): Promise<void>;
}

export function startSweeper(ctx: AppContext): SweeperHandle {
  if (ctx.config.sweeperIntervalSeconds <= 0) return { stop: async () => {} };
  let current: Promise<void> | null = null;
  const timer = setInterval(() => {
    if (current) return;
    current = sweep(ctx)
      .then((r) => {
        if (r.reconciled || r.expired || r.researchRecovered || r.errors) ctx.log.info({ sweep: r }, "sweeper run");
      })
      .catch(async (err: unknown) => {
        ctx.log.error({ err }, "sweeper failed");
        await ctx.errors.capture({ source: "job", level: "error", code: "SWEEPER_FAILED", message: "The sweeper run failed", err });
      })
      .finally(() => {
        current = null;
      });
  }, ctx.config.sweeperIntervalSeconds * 1000);
  timer.unref();
  return {
    stop: async () => {
      clearInterval(timer);
      await current;
    },
  };
}
