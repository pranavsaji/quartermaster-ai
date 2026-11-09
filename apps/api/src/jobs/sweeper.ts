import { and, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { idempotencyKeys, intentCertificates, jobLeases, paymentAttempts, purchaseOrders, sessions, type Database } from "@qm/database";
import type { AppContext } from "../context";
import { appendAudit } from "../services/audit";
import { releaseReservation } from "../services/budget";
import { reconcilePayment } from "../services/payments";
import { refreshRequestStatus } from "../services/procurement/status";

export interface SweepReport {
  reconciled: number;
  expired: number;
  sessionsPurged: number;
  idempotencyPurged: number;
  errors: number;
}

const INSTANCE_ID = randomUUID();
const LEASE_SECONDS = 120;

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
 *  3. Purge expired sessions and idempotency records.
 */
export async function sweep(ctx: AppContext): Promise<SweepReport> {
  const report: SweepReport = { reconciled: 0, expired: 0, sessionsPurged: 0, idempotencyPurged: 0, errors: 0 };
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
            or(
              and(eq(paymentAttempts.status, "CAPTURE_PENDING"), lt(paymentAttempts.updatedAt, new Date(now.getTime() - 2 * 60_000))),
              and(inArray(paymentAttempts.status, ["ORDER_CREATED", "PAYER_APPROVED"]), lt(paymentAttempts.updatedAt, new Date(now.getTime() - 10 * 60_000))),
            ),
          ),
        )
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

    const expired = await ctx.db
      .select({ cert: intentCertificates, payment: paymentAttempts })
      .from(intentCertificates)
      .leftJoin(paymentAttempts, eq(paymentAttempts.intentId, intentCertificates.id))
      .where(and(eq(intentCertificates.status, "ACTIVE"), lt(intentCertificates.expiresAt, now)))
      .limit(100);
    for (const { cert, payment } of expired) {
      try {
        if (payment?.paypalOrderId) {
          if (!ctx.paypal.configured) continue; // cannot prove no capture happened; keep the hold
          const status = await reconcilePayment(ctx, payment.id);
          if (status === "COMPLETED" || status === "CAPTURE_PENDING") continue;
        }
        if (payment?.status === "CAPTURE_PENDING") continue;
        await ctx.db.transaction(async (tx) => {
          const [fresh] = await tx.select().from(intentCertificates).where(eq(intentCertificates.id, cert.id)).for("update");
          if (fresh?.status !== "ACTIVE") return;
          await tx.update(intentCertificates).set({ status: "EXPIRED" }).where(eq(intentCertificates.id, cert.id));
          await releaseReservation(tx, cert.id, "CERTIFICATE_EXPIRED", now);
          if (payment) await tx.update(paymentAttempts).set({ status: "VOIDED", failureCode: "CERTIFICATE_EXPIRED", updatedAt: now }).where(and(eq(paymentAttempts.id, payment.id), inArray(paymentAttempts.status, ["CREATED", "ORDER_CREATED", "PAYER_APPROVED"])));
          await tx.update(purchaseOrders).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(purchaseOrders.id, cert.purchaseOrderId), inArray(purchaseOrders.status, ["APPROVED", "PAYMENT_PENDING"])));
          const [po] = await tx.select({ requestId: purchaseOrders.requestId }).from(purchaseOrders).where(eq(purchaseOrders.id, cert.purchaseOrderId));
          if (po?.requestId) await refreshRequestStatus(tx, po.requestId, now);
          await appendAudit(tx, { organizationId: cert.organizationId, action: "certificate.expired", actorType: "SYSTEM", entityType: "intent_certificate", entityId: cert.id, data: { expired_at: cert.expiresAt, reservation_released: true } });
        });
        report.expired++;
      } catch (err) {
        report.errors++;
        ctx.log.warn({ err, intent_id: cert.id }, "certificate expiry failed");
      }
    }

    const purgedSessions = await ctx.db.delete(sessions).where(or(lt(sessions.expiresAt, now), lt(sessions.revokedAt, new Date(now.getTime() - 86_400_000)))).returning({ id: sessions.id });
    report.sessionsPurged = purgedSessions.length;
    const purgedKeys = await ctx.db.delete(idempotencyKeys).where(lt(idempotencyKeys.createdAt, new Date(now.getTime() - 48 * 3_600_000))).returning({ id: idempotencyKeys.id });
    report.idempotencyPurged = purgedKeys.length;
  } finally {
    await releaseLease(ctx.db, "sweeper");
  }
  return report;
}

export function startSweeper(ctx: AppContext): () => void {
  if (ctx.config.sweeperIntervalSeconds <= 0) return () => {};
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const r = await sweep(ctx);
      if (r.reconciled || r.expired || r.errors) ctx.log.info({ sweep: r }, "sweeper run");
    } catch (err) {
      ctx.log.error({ err }, "sweeper failed");
    } finally {
      running = false;
    }
  }, ctx.config.sweeperIntervalSeconds * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
