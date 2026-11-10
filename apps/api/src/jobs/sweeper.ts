import { PAYABLE_PO_STATUSES, isPreCapturePayment } from "@qm/contracts";
import { and, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  agentRuns,
  idempotencyKeys,
  intentCertificates,
  jobLeases,
  paymentAttempts,
  purchaseRequests,
  rateLimitHits,
  sessions,
  type Database,
} from "@qm/database";
import type { AppContext } from "../context";
import { appendAudit } from "../services/audit";
import { retryOnConflict } from "../services/common";
import { releaseReservation } from "../services/budget";
import { setOrderStatus } from "../services/order-status";
import { runMonitors } from "../services/monitoring/status";
import { resetSampleWorkspaceIfDue } from "../services/sample-workspace";
import { reconcilePayment, reconcileRefunds, transitionPayment, voidAbandonedCapture } from "../services/payments";

export interface SweepReport {
  reconciled: number;
  expired: number;
  researchRecovered: number;
  refundsReconciled: number;
  sessionsPurged: number;
  idempotencyPurged: number;
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
    // Nightly reset of the shared sample workspace, when SAMPLE_RESET_HOUR_UTC is set.
    report.errors += await resetSampleWorkspaceIfDue(ctx, now);

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
  } finally {
    await releaseLease(ctx.db, "sweeper");
  }
  return report;
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
