import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  budgetReservations,
  idempotencyKeys,
  intentCertificates,
  paymentAttempts,
  purchaseOrders,
  purchaseRequests,
  sessions,
} from "@qm/database";
import type { AppContext } from "../../apps/api/src/context";
import { acquireLease, releaseLease, startSweeper, sweep } from "../../apps/api/src/jobs/sweeper";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedOrder, relaxMandate } from "../helpers/flows";

/**
 * The background sweeper: certificate expiry with and without PayPal orders, reconciliation
 * failures, lease election, purging, and the interval scheduler.
 */
let h: Harness;
let owner: Client;
let orgId: string;
let userId: string;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
  const me = (await owner.get("/auth/me")).body.user;
  orgId = me.organization.id;
  userId = me.id;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  h.paypal.reset();
});
afterAll(async () => {
  await h.close();
});

const minutesAgo = (m: number) => new Date(h.clock.now.getTime() - m * 60_000);

async function expireCertificate(intentId: string) {
  await h.ctx.db
    .update(intentCertificates)
    .set({ expiresAt: minutesAgo(1) })
    .where(eq(intentCertificates.id, intentId));
}

async function state(o: { intentId: string; paymentId: string; proposal: { id: string } }) {
  const [cert] = await h.ctx.db.select().from(intentCertificates).where(eq(intentCertificates.id, o.intentId));
  const [reservation] = await h.ctx.db.select().from(budgetReservations).where(eq(budgetReservations.intentId, o.intentId));
  const [payment] = await h.ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.id, o.paymentId));
  const [po] = await h.ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, o.proposal.id));
  return { cert: cert!, reservation: reservation!, payment: payment!, po: po! };
}

describe("certificate expiry", () => {
  it("keeps the hold while PayPal is unavailable, then voids the unpaid order once PayPal confirms nothing was captured", async () => {
    const o = await approvedOrder(owner, "CLN-GLOVES");
    await expireCertificate(o.intentId);

    // Without PayPal the sweeper cannot prove no capture happened, so it must not release budget.
    vi.spyOn(h.ctx.paypal, "configured", "get").mockReturnValue(false);
    const calls = h.paypal.calls.length;
    const blind = await sweep(h.ctx);
    expect(blind.reconciled).toBe(0);
    expect(h.paypal.calls.length).toBe(calls);
    let s = await state(o);
    expect(s.cert.status).toBe("ACTIVE");
    expect(s.reservation.status).toBe("ACTIVE");
    expect(s.payment.status).toBe("ORDER_CREATED");
    vi.restoreAllMocks();

    const report = await sweep(h.ctx);
    expect(report.expired).toBeGreaterThanOrEqual(1);
    s = await state(o);
    expect(s.cert.status).toBe("EXPIRED");
    expect(s.reservation.status).toBe("RELEASED");
    expect(s.payment.status).toBe("VOIDED");
    expect(s.payment.failureCode).toBe("CERTIFICATE_EXPIRED");
    expect(s.po.status).toBe("EXPIRED");
  });

  it("records a capture discovered while expiring a certificate instead of releasing its budget", async () => {
    const o = await approvedOrder(owner, "CLN-TOWELS");
    h.paypal.approve(o.paypalOrderId);
    h.paypal.captureDirectly(o.paypalOrderId);
    await expireCertificate(o.intentId);

    await sweep(h.ctx);
    const s = await state(o);
    expect(s.payment.status).toBe("COMPLETED");
    expect(s.payment.capturedAmountMinor).toBe(o.total);
    expect(s.cert.status).toBe("CONSUMED");
    expect(s.reservation.status).toBe("CONSUMED");
    expect(s.po.status).toBe("PAID");
  });

  it("voids a capture that never reached PayPal once the approval expired, counting it as expired", async () => {
    const o = await approvedOrder(owner, "ING-CANOLA");
    h.paypal.approve(o.paypalOrderId);
    await h.ctx.db
      .update(paymentAttempts)
      .set({ status: "CAPTURE_PENDING", updatedAt: minutesAgo(20) })
      .where(eq(paymentAttempts.id, o.paymentId));
    await expireCertificate(o.intentId);

    const report = await sweep(h.ctx);
    expect(report.expired).toBeGreaterThanOrEqual(1);
    const s = await state(o);
    expect(s.payment.status).toBe("VOIDED");
    expect(s.payment.failureCode).toBe("CAPTURE_ABANDONED");
    expect(s.reservation.status).toBe("RELEASED");
    expect(s.cert.status).toBe("REVOKED");
    expect(h.paypal.orders.get(o.paypalOrderId)!.order.status).toBe("APPROVED");
  });

  it("counts reconciliation and expiry failures, keeps going, and succeeds on a later run", async () => {
    const o = await approvedOrder(owner, "PKG-NAPKINS");
    await h.ctx.db
      .update(paymentAttempts)
      .set({ updatedAt: minutesAgo(20) })
      .where(eq(paymentAttempts.id, o.paymentId));
    await expireCertificate(o.intentId);
    vi.spyOn(h.ctx.paypal, "getOrder").mockRejectedValue(new Error("connect ECONNREFUSED"));
    const warn = vi.spyOn(h.ctx.log, "warn");

    const failed = await sweep(h.ctx);
    // Once while reconciling the stale order, once while trying to expire its certificate.
    expect(failed.errors).toBeGreaterThanOrEqual(2);
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ payment_id: o.paymentId }), "reconciliation failed");
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ intent_id: o.intentId }), "certificate expiry failed");
    let s = await state(o);
    expect(s.cert.status).toBe("ACTIVE");
    expect(s.reservation.status).toBe("ACTIVE");
    expect(s.payment.lastReconciledAt).toBeNull();

    vi.restoreAllMocks();
    const recovered = await sweep(h.ctx);
    expect(recovered.errors).toBe(0);
    s = await state(o);
    expect(s.cert.status).toBe("EXPIRED");
    expect(s.reservation.status).toBe("RELEASED");
    expect(s.payment.status).toBe("VOIDED");
  });
});

describe("housekeeping", () => {
  async function seedPurgeable() {
    const tag = randomUUID();
    const hash = (s: string) => createHash("sha256").update(`${tag}:${s}`).digest("hex");
    const now = h.clock.now;
    const insertSession = async (name: string, expiresAt: Date, revokedAt: Date | null = null) =>
      (
        await h.ctx.db
          .insert(sessions)
          .values({ tokenHash: hash(name), userId, organizationId: orgId, expiresAt, revokedAt })
          .returning({ id: sessions.id })
      )[0]!.id;
    const ids = {
      expired: await insertSession("expired", minutesAgo(1)),
      longRevoked: await insertSession("long-revoked", new Date(now.getTime() + 3_600_000), minutesAgo(25 * 60)),
      recentlyRevoked: await insertSession("recently-revoked", new Date(now.getTime() + 3_600_000), minutesAgo(5)),
      live: await insertSession("live", new Date(now.getTime() + 3_600_000)),
    };
    const insertKey = async (name: string, createdAt: Date) =>
      (
        await h.ctx.db
          .insert(idempotencyKeys)
          .values({ organizationId: orgId, userId, key: `${tag}-${name}`, route: "test", requestHash: "x", status: "COMPLETED", createdAt })
          .returning({ id: idempotencyKeys.id })
      )[0]!.id;
    const keys = { old: await insertKey("old", minutesAgo(49 * 60)), recent: await insertKey("recent", minutesAgo(60)) };
    return { ids, keys };
  }

  const remaining = async (ids: string[], table: typeof sessions | typeof idempotencyKeys) =>
    (await h.ctx.db.select({ id: table.id }).from(table).where(inArray(table.id, ids))).map((r) => r.id).sort();

  it("purges expired and long-revoked sessions and idempotency records older than 48 hours", async () => {
    const { ids, keys } = await seedPurgeable();
    const report = await sweep(h.ctx);
    expect(report.sessionsPurged).toBeGreaterThanOrEqual(2);
    expect(report.idempotencyPurged).toBeGreaterThanOrEqual(1);
    expect(await remaining(Object.values(ids), sessions)).toEqual([ids.recentlyRevoked, ids.live].sort());
    expect(await remaining(Object.values(keys), idempotencyKeys)).toEqual([keys.recent]);
    // The signed-in client's own session survives.
    expect((await owner.get("/auth/me")).status).toBe(200);
  });

  it("does nothing while another instance holds the lease", async () => {
    const { ids } = await seedPurgeable();
    expect(await acquireLease(h.ctx.db, "sweeper", h.clock.now, "another-instance")).toBe(true);
    try {
      const report = await sweep(h.ctx);
      expect(report).toEqual({
        reconciled: 0,
        expired: 0,
        researchRecovered: 0,
        refundsReconciled: 0,
        sessionsPurged: 0,
        idempotencyPurged: 0,
        errors: 0,
      });
      expect(await remaining([ids.expired], sessions)).toEqual([ids.expired]);
    } finally {
      await releaseLease(h.ctx.db, "sweeper", "another-instance");
    }
    // Releasing someone else's lease is a no-op for us; once it is gone the sweep runs again.
    const after = await sweep(h.ctx);
    expect(after.sessionsPurged).toBeGreaterThanOrEqual(1);
    expect(await remaining([ids.expired], sessions)).toEqual([]);
  });
});

describe("startSweeper", () => {
  const withInterval = (seconds: number, overrides: Partial<AppContext> = {}): AppContext => ({
    ...h.ctx,
    ...overrides,
    config: { ...h.ctx.config, sweeperIntervalSeconds: seconds },
  });

  it("schedules nothing when the interval is zero", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const handle = startSweeper(withInterval(0));
    expect(vi.getTimerCount()).toBe(0);
    await expect(handle.stop()).resolves.toBeUndefined();
  });

  it("runs on the interval, never overlaps runs, and stop() waits for the run in flight", async () => {
    const created = await owner.post("/procurement/requests", { instruction: "Restock gloves before the deploy" });
    const id = created.body.id as string;
    await h.ctx.db
      .update(purchaseRequests)
      .set({ status: "RESEARCHING", researchStartedAt: minutesAgo(60) })
      .where(eq(purchaseRequests.id, id));
    const info = vi.spyOn(h.ctx.log, "info");

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const handle = startSweeper(withInterval(30));
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(30_000); // starts a run
    vi.advanceTimersByTime(30_000); // skipped: the first run is still in flight
    await handle.stop();
    expect(vi.getTimerCount()).toBe(0);

    const [row] = await h.ctx.db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    expect(row!.status).toBe("FAILED");
    const runs = info.mock.calls.filter((c) => c[1] === "sweeper run");
    expect(runs).toHaveLength(1);
    expect(runs[0]![0]).toMatchObject({ sweep: { researchRecovered: 1 } });
  });

  it("logs a failed run instead of crashing the process", async () => {
    const broken = {
      insert: () => {
        throw new Error("database is unavailable");
      },
    } as unknown as AppContext["db"];
    const error = vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const handle = startSweeper(withInterval(10, { db: broken }));
    vi.advanceTimersByTime(10_000);
    await handle.stop();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), "sweeper failed");
  });
});

describe("leases", () => {
  it("lets the holder renew its own lease and only the holder release it", async () => {
    const name = `test-${randomUUID()}`;
    const t = h.clock.now;
    expect(await acquireLease(h.ctx.db, name, t, "a")).toBe(true);
    expect(await acquireLease(h.ctx.db, name, t, "a")).toBe(true);
    await releaseLease(h.ctx.db, name, "b");
    expect(await acquireLease(h.ctx.db, name, t, "b")).toBe(false);
    await releaseLease(h.ctx.db, name, "a");
    expect(await acquireLease(h.ctx.db, name, t, "b")).toBe(true);
    await releaseLease(h.ctx.db, name, "b");
  });
});
