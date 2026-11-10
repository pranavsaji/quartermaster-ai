import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import request from "supertest";
import {
  agentRuns,
  auditEvents,
  invitations,
  memberships,
  passwordResetTokens,
  paypalWebhookEvents,
  purchaseRequests,
  systemErrors,
  toolExecutions,
  users,
} from "@qm/database";
import { createApp } from "../../apps/api/src/http/app";
import { SWEEPER_STALE_MONITOR, checkSweeperLiveness, purgeExpiredRecords, sweep, sweeperHealth } from "../../apps/api/src/jobs/sweeper";
import { clearAnalyticsCache } from "../../apps/api/src/services/analytics";
import { ownerNotificationRecipients } from "../../apps/api/src/services/notifications";
import { createHarness, type Client, type Harness } from "../helpers/harness";

/**
 * Operations hardening: readiness (draining, database timeout, sweeper liveness), the stale-sweeper
 * monitor, retention purges, email notifications to owners with failure tracking, and the
 * analytics cache.
 */

const resend: { to: string[]; subject: string }[] = [];
let resendStatus = 200;
const monitoringFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  if (String(input).includes("api.resend.com")) {
    resend.push(JSON.parse(String(init?.body)) as { to: string[]; subject: string });
    return new Response("{}", { status: resendStatus });
  }
  return new Response("{}", { status: 200 });
}) as typeof fetch;

let h: Harness;
let owner: Client;
let orgId: string;

beforeAll(async () => {
  h = await createHarness({
    monitoringFetch,
    extraEnv: { RESEND_API_KEY: "re_test", NOTIFY_CHANNEL: "email", ANALYTICS_CACHE_SECONDS: "30", RETENTION_DAYS: "90" },
  });
  owner = await h.agent("owner");
  orgId = (await owner.get("/auth/me")).body.user.organization.id;
});
afterAll(async () => {
  await h.close();
});

const daysAgo = (d: number) => new Date(h.clock.now.getTime() - d * 86_400_000);

describe("readiness probe", () => {
  it("reports the sweeper's liveness: unknown before any sweep, ok with its age after one", async () => {
    const before = await request(h.app).get("/readyz");
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ status: "ready", sweeper: "unknown", last_sweep_age_seconds: null });
    await sweep(h.ctx);
    h.clock.now = new Date(h.clock.now.getTime() + 30_000);
    const after = await request(h.app).get("/readyz");
    expect(after.body).toMatchObject({ status: "ready", sweeper: "ok", last_sweep_age_seconds: 30 });
    expect(after.headers["cache-control"]).toBe("no-store");
  });

  it("answers 503 while the process drains, so the platform stops routing to it", async () => {
    const lifecycle = { draining: false };
    const app = createApp(h.ctx, { lifecycle });
    expect((await request(app).get("/readyz")).status).toBe(200);
    lifecycle.draining = true;
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "draining" });
    // Liveness is unaffected: the process is healthy, only leaving.
    expect((await request(app).get("/healthz")).status).toBe(200);
  });

  it("answers 503 when the database does not answer within the timeout", async () => {
    const ping = vi.spyOn(h.ctx.database, "ping").mockImplementation(() => new Promise<boolean>(() => undefined));
    try {
      const app = createApp(h.ctx, { readinessTimeoutMs: 50 });
      const started = Date.now();
      const res = await request(app).get("/readyz");
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: "unavailable" });
      expect(Date.now() - started).toBeLessThan(2000);
    } finally {
      ping.mockRestore();
    }
  });
});

describe("stale sweeper monitor", () => {
  const monitorRow = async () => {
    const rows = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, SWEEPER_STALE_MONITOR));
    return rows[0] ?? null;
  };

  it("alerts once the last successful sweep is older than the limit, and resolves when sweeps resume", async () => {
    await sweep(h.ctx);
    const startedAt = h.clock.now;
    // The harness runs no in-process sweeper: the limit is 3 × five minutes.
    expect(h.ctx.config.sweeperStaleAfterSeconds).toBe(900);
    h.clock.now = new Date(h.clock.now.getTime() + 600_000);
    expect((await checkSweeperLiveness(h.ctx, startedAt))?.status).toBe("ok");
    expect(await monitorRow()).toBeNull();

    h.clock.now = new Date(h.clock.now.getTime() + 600_000);
    expect((await checkSweeperLiveness(h.ctx, startedAt))?.status).toBe("stale");
    const open = await monitorRow();
    expect(open).toMatchObject({ source: "monitor", level: "error", resolvedAt: null });
    expect(open!.message).toMatch(/last successful sweep was 20 minutes ago/);
    const ready = await request(h.app).get("/readyz");
    expect(ready.status).toBe(200); // reported, never a reason to restart a healthy API
    expect(ready.body).toMatchObject({ sweeper: "stale", last_sweep_age_seconds: 1200 });

    await sweep(h.ctx);
    expect((await checkSweeperLiveness(h.ctx, startedAt))?.status).toBe("ok");
    expect((await monitorRow())!.resolvedAt).not.toBeNull();
  });

  it("alerts when no sweep was ever recorded once the instance has been up longer than the limit", async () => {
    await h.ctx.db.execute(sql`delete from job_leases where name = 'sweeper:last_success'`);
    await h.ctx.db.delete(systemErrors).where(eq(systemErrors.code, SWEEPER_STALE_MONITOR));
    const startedAt = h.clock.now;
    h.clock.now = new Date(h.clock.now.getTime() + 60_000);
    expect((await checkSweeperLiveness(h.ctx, startedAt))?.status).toBe("unknown");
    expect(await monitorRow()).toBeNull();
    h.clock.now = new Date(h.clock.now.getTime() + 900_000);
    await checkSweeperLiveness(h.ctx, startedAt);
    expect((await monitorRow())!.message).toMatch(/No sweep has completed/);
    await sweep(h.ctx);
  });

  it("is disabled by SWEEPER_STALE_AFTER_SECONDS=0", async () => {
    const ctx = { ...h.ctx, config: { ...h.ctx.config, sweeperStaleAfterSeconds: 0 } };
    expect((await sweeperHealth(ctx)).status).toBe("disabled");
  });
});

describe("retention purge", () => {
  it("removes operational records older than RETENTION_DAYS and keeps evidence and recent rows", async () => {
    const [user] = await h.ctx.db.select().from(users).limit(1);
    const [req] = await h.ctx.db
      .insert(purchaseRequests)
      .values({ organizationId: orgId, instruction: "retention test", currency: "USD", status: "FAILED", createdBy: user!.id })
      .returning();
    const [run] = await h.ctx.db
      .insert(agentRuns)
      .values({ organizationId: orgId, requestId: req!.id, kind: "RESEARCH", status: "SUCCEEDED", aiMode: "DETERMINISTIC_FALLBACK" })
      .returning();
    const step = (startedAt: Date) => ({
      organizationId: orgId,
      agentRunId: run!.id,
      tool: "search",
      status: "SUCCEEDED" as const,
      summary: "s",
      durationMs: 1,
      startedAt,
    });
    await h.ctx.db.insert(toolExecutions).values([step(daysAgo(120)), step(daysAgo(10))]);
    const event = (id: string, receivedAt: Date) => ({
      eventId: id,
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      verified: true,
      processed: true,
      payload: {},
      receivedAt,
    });
    await h.ctx.db
      .insert(paypalWebhookEvents)
      .values([event(`WH-OLD-${randomUUID()}`, daysAgo(100)), event(`WH-NEW-${randomUUID()}`, daysAgo(1))]);
    const group = (fingerprint: string, lastSeenAt: Date) => ({
      fingerprint,
      source: "api" as const,
      level: "error" as const,
      code: "RETENTION_TEST",
      message: "m",
      firstSeenAt: lastSeenAt,
      lastSeenAt,
    });
    await h.ctx.db.insert(systemErrors).values([group(`old-${randomUUID()}`, daysAgo(91)), group(`new-${randomUUID()}`, daysAgo(5))]);
    const invite = (email: string, expiresAt: Date, acceptedAt: Date | null) => ({
      organizationId: orgId,
      email,
      role: "VIEWER" as const,
      tokenHash: randomUUID(),
      expiresAt,
      acceptedAt,
    });
    await h.ctx.db
      .insert(invitations)
      .values([
        invite("stale@shop.example.org", daysAgo(95), null),
        invite("accepted@shop.example.org", daysAgo(95), daysAgo(96)),
        invite("fresh@shop.example.org", daysAgo(1), null),
      ]);
    await h.ctx.db.insert(passwordResetTokens).values([
      { userId: user!.id, tokenHash: randomUUID(), expiresAt: daysAgo(92) },
      { userId: user!.id, tokenHash: randomUUID(), expiresAt: daysAgo(-1) },
    ]);
    const [auditBefore] = await h.ctx.db.select({ n: sql<number>`count(*)::int` }).from(auditEvents);

    const purged = await purgeExpiredRecords(h.ctx, h.ctx.now());
    expect(purged).toMatchObject({ toolExecutions: 1, webhookEvents: 1, invitations: 1, passwordResets: 1 });
    expect(purged.systemErrors).toBeGreaterThanOrEqual(1);

    const steps = await h.ctx.db.select().from(toolExecutions).where(eq(toolExecutions.agentRunId, run!.id));
    expect(steps).toHaveLength(1);
    // The run itself (tokens used, outcome) stays.
    expect(await h.ctx.db.select().from(agentRuns).where(eq(agentRuns.id, run!.id))).toHaveLength(1);
    const codes = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "RETENTION_TEST"));
    expect(codes.map((c) => c.fingerprint.split("-")[0])).toEqual(["new"]);
    const left = await h.ctx.db.select({ email: invitations.email }).from(invitations).where(eq(invitations.organizationId, orgId));
    expect(left.map((i) => i.email).sort()).toEqual(expect.arrayContaining(["accepted@shop.example.org", "fresh@shop.example.org"]));
    expect(left.map((i) => i.email)).not.toContain("stale@shop.example.org");
    const [auditAfter] = await h.ctx.db.select({ n: sql<number>`count(*)::int` }).from(auditEvents);
    expect(auditAfter!.n).toBe(auditBefore!.n);

    // The sweep runs the same purge and counts it.
    await h.ctx.db.insert(toolExecutions).values([step(daysAgo(200))]);
    const report = await sweep(h.ctx);
    expect(report.retentionPurged).toBeGreaterThanOrEqual(1);
  });
});

describe("email notifications to workspace owners", () => {
  let realOwner: string;

  beforeAll(async () => {
    // The sample workspace's own accounts are not real mailboxes; add a real owner, a viewer and a
    // disabled owner.
    const add = async (email: string, role: "OWNER" | "VIEWER", disabled = false) => {
      const [u] = await h.ctx.db.insert(users).values({ email, name: email, passwordHash: "x", disabled }).returning();
      await h.ctx.db.insert(memberships).values({ organizationId: orgId, userId: u!.id, role });
    };
    realOwner = `owner-${randomUUID().slice(0, 8)}@shop.example.org`;
    await add(realOwner, "OWNER");
    await add(`viewer-${randomUUID().slice(0, 8)}@shop.example.org`, "VIEWER");
    await add(`gone-${randomUUID().slice(0, 8)}@shop.example.org`, "OWNER", true);
    await add(`removed-${randomUUID().slice(0, 8)}@member.invalid`, "OWNER");
  });

  it("addresses enabled owners with deliverable addresses only", async () => {
    expect(await ownerNotificationRecipients(h.ctx.db)(orgId)).toEqual([realOwner]);
  });

  it("emails owners through the mailer when NOTIFY_CHANNEL=email", async () => {
    resend.length = 0;
    expect(h.ctx.notifier.emailEnabled).toBe(true);
    await h.ctx.notifier.send({
      kind: "APPROVAL_REQUIRED",
      organization_id: orgId,
      title: "Purchase ready for approval",
      summary: "Two proposals are ready.",
      link_path: "/procurement/x",
    });
    expect(resend).toHaveLength(1);
    expect(resend[0]).toMatchObject({ to: [realOwner], subject: "Purchase ready for approval" });
  });

  it("records failed deliveries as one deduplicated warning group", async () => {
    await h.ctx.db.delete(systemErrors).where(eq(systemErrors.code, "NOTIFY_FAILED"));
    resendStatus = 500;
    try {
      const n = { kind: "PAYMENT_COMPLETED" as const, organization_id: orgId, title: "Paid", summary: "s" };
      await h.ctx.notifier.send(n);
      await h.ctx.notifier.send(n);
      // The tracker write is fire-and-forget from the notifier; let it land.
      await vi.waitFor(async () => {
        const rows = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "NOTIFY_FAILED"));
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ level: "warning", occurrences: 2 });
        expect(rows[0]!.message).toBe("Notification delivery failed via email");
        expect(JSON.stringify(rows[0]!.sample)).not.toContain("@");
      });
    } finally {
      resendStatus = 200;
    }
  });
});

describe("analytics summary", () => {
  it("serves a cached summary for ANALYTICS_CACHE_SECONDS, per organisation", async () => {
    clearAnalyticsCache();
    const first = (await owner.get("/analytics/summary")).body;
    const [user] = await h.ctx.db.select().from(users).limit(1);
    await h.ctx.db
      .insert(purchaseRequests)
      .values({ organizationId: orgId, instruction: "cache test", currency: "USD", status: "FAILED", createdBy: user!.id });
    const cached = (await owner.get("/analytics/summary")).body;
    expect(cached.totals.requests_total).toBe(first.totals.requests_total);
    clearAnalyticsCache(orgId);
    const fresh = (await owner.get("/analytics/summary")).body;
    expect(fresh.totals.requests_total).toBe(first.totals.requests_total + 1);
    await h.ctx.db
      .delete(purchaseRequests)
      .where(and(eq(purchaseRequests.organizationId, orgId), eq(purchaseRequests.instruction, "cache test")));
  });
});
