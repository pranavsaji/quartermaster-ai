import { and, desc, eq, gt, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { SETTLED_PAYMENT_STATUSES, type OpsHealthDto, type PayPalNotificationStatusDto } from "@qm/contracts";
import { paymentAttempts, paypalWebhookEvents, securityFindings } from "@qm/database";
import type { AppContext } from "../../context";

const HOUR = 3_600_000;
/** A completed capture should be confirmed by PayPal's notification well within this. */
export const WEBHOOK_CONFIRMATION_GRACE_MS = 30 * 60_000;
/** A capture still pending with PayPal after this long needs a human to look. */
export const CAPTURE_PENDING_ALERT_MS = 15 * 60_000;

/** True when a verified PayPal notification names this payment's order or capture. */
const confirmedByWebhook = (): SQL => sql`exists (
  select 1 from ${paypalWebhookEvents} w
  where w.verified and (w.resource_id = ${paymentAttempts.paypalOrderId} or w.resource_id = ${paymentAttempts.paypalCaptureId})
)`;

async function unconfirmedCaptures(ctx: AppContext, now: Date, organizationId?: string): Promise<number> {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(paymentAttempts)
    .where(
      and(
        ...(organizationId ? [eq(paymentAttempts.organizationId, organizationId)] : []),
        inArray(paymentAttempts.status, [...SETTLED_PAYMENT_STATUSES]),
        isNotNull(paymentAttempts.completedAt),
        gt(paymentAttempts.completedAt, new Date(now.getTime() - 7 * 24 * HOUR)),
        lt(paymentAttempts.completedAt, new Date(now.getTime() - WEBHOOK_CONFIRMATION_GRACE_MS)),
        sql`not ${confirmedByWebhook()}`,
      ),
    );
  return row?.n ?? 0;
}

async function rejectedSignatures(ctx: AppContext, since: Date, organizationId?: string): Promise<number> {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(securityFindings)
    .where(
      and(
        eq(securityFindings.type, "WEBHOOK_SIGNATURE_INVALID"),
        gt(securityFindings.createdAt, since),
        ...(organizationId ? [eq(securityFindings.organizationId, organizationId)] : []),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Whether PayPal's signed notifications are reaching this deployment for one organisation. A
 * payment completes from the API's own capture call; the notification is PayPal's independent
 * confirmation, and missing ones point at a wrong webhook URL or id.
 */
export async function paypalNotificationStatus(ctx: AppContext, organizationId: string): Promise<PayPalNotificationStatusDto> {
  const now = ctx.now();
  const since = new Date(now.getTime() - 24 * HOUR);
  const mine = or(
    eq(paypalWebhookEvents.organizationId, organizationId),
    sql`exists (select 1 from ${paymentAttempts} p where p.organization_id = ${organizationId}
      and (p.paypal_order_id = ${paypalWebhookEvents.resourceId} or p.paypal_capture_id = ${paypalWebhookEvents.resourceId}))`,
  );
  const [last] = await ctx.db
    .select({ at: paypalWebhookEvents.receivedAt, type: paypalWebhookEvents.eventType })
    .from(paypalWebhookEvents)
    .where(and(eq(paypalWebhookEvents.verified, true), mine))
    .orderBy(desc(paypalWebhookEvents.receivedAt))
    .limit(1);
  const [count] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(paypalWebhookEvents)
    .where(and(eq(paypalWebhookEvents.verified, true), gt(paypalWebhookEvents.receivedAt, since), mine));
  return {
    configured: ctx.paypal.configured && Boolean(ctx.config.paypal.webhookId),
    last_received_at: last?.at.toISOString() ?? null,
    last_event_type: last?.type ?? null,
    received_24h: count?.n ?? 0,
    unconfirmed_captures_7d: await unconfirmedCaptures(ctx, now, organizationId),
    rejected_signatures_24h: await rejectedSignatures(ctx, since, organizationId),
  };
}

export async function opsHealth(ctx: AppContext): Promise<OpsHealthDto> {
  const now = ctx.now();
  const since = new Date(now.getTime() - 24 * HOUR);
  const [last] = await ctx.db
    .select({ at: paypalWebhookEvents.receivedAt })
    .from(paypalWebhookEvents)
    .where(eq(paypalWebhookEvents.verified, true))
    .orderBy(desc(paypalWebhookEvents.receivedAt))
    .limit(1);
  const [received] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(paypalWebhookEvents)
    .where(and(eq(paypalWebhookEvents.verified, true), gt(paypalWebhookEvents.receivedAt, since)));
  const [pending] = await ctx.db
    .select({ n: sql<number>`count(*)::int`, oldest: sql<Date | null>`min(${paymentAttempts.updatedAt})` })
    .from(paymentAttempts)
    .where(eq(paymentAttempts.status, "CAPTURE_PENDING"));
  const oldest = pending?.oldest ? new Date(pending.oldest) : null;
  return {
    error_tracking: { open_errors: await ctx.errors.openCount(), sentry: Boolean(ctx.config.monitoring.sentryDsn) },
    alerting: ctx.errors.alertChannels,
    email: { enabled: ctx.mailer.enabled, provider: ctx.mailer.provider },
    paypal_webhooks: {
      last_received_at: last?.at.toISOString() ?? null,
      received_24h: received?.n ?? 0,
      rejected_24h: await rejectedSignatures(ctx, since),
    },
    payments: {
      capture_pending: pending?.n ?? 0,
      oldest_pending_minutes: oldest ? Math.max(0, Math.floor((now.getTime() - oldest.getTime()) / 60_000)) : null,
    },
  };
}

/**
 * Health monitors, run by the sweeper. Each condition is one error group that alerts when it
 * appears and resolves itself once it clears.
 */
export async function runMonitors(ctx: AppContext): Promise<void> {
  const now = ctx.now();
  const [stuck] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(paymentAttempts)
    .where(
      and(eq(paymentAttempts.status, "CAPTURE_PENDING"), lt(paymentAttempts.updatedAt, new Date(now.getTime() - CAPTURE_PENDING_ALERT_MS))),
    );
  if ((stuck?.n ?? 0) > 0) {
    await ctx.errors.monitor(
      "monitor.capture_pending",
      "error",
      `${stuck!.n} payment(s) have waited over ${CAPTURE_PENDING_ALERT_MS / 60_000} minutes for PayPal to confirm a capture.`,
      { payments: stuck!.n },
    );
  } else await ctx.errors.clearMonitor("monitor.capture_pending");

  if (ctx.paypal.configured && ctx.config.paypal.webhookId) {
    const missing = await unconfirmedCaptures(ctx, now);
    if (missing > 0) {
      await ctx.errors.monitor(
        "monitor.paypal_webhook_missing",
        "error",
        `${missing} completed payment(s) have no PayPal notification after ${WEBHOOK_CONFIRMATION_GRACE_MS / 60_000} minutes. Check the webhook URL and PAYPAL_WEBHOOK_ID.`,
        { payments: missing },
      );
    } else await ctx.errors.clearMonitor("monitor.paypal_webhook_missing");
  }

  const rejected = await rejectedSignatures(ctx, new Date(now.getTime() - HOUR));
  if (rejected >= 3) {
    await ctx.errors.monitor(
      "monitor.webhook_signatures",
      "error",
      `${rejected} PayPal notifications failed signature verification in the last hour.`,
      { rejected },
    );
  } else await ctx.errors.clearMonitor("monitor.webhook_signatures");
}
