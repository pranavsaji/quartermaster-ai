import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import request from "supertest";
import { rateLimitHits } from "@qm/database";
import { createApp } from "../../apps/api/src/http/app";
import { DatabaseRateLimitStore } from "../../apps/api/src/http/rate-limit-store";
import { sweep } from "../../apps/api/src/jobs/sweeper";
import { createHarness, type Harness } from "../helpers/harness";

/** Rate limits kept in the database hold across API instances (and restarts). */
let h: Harness;

beforeAll(async () => {
  h = await createHarness({ extraEnv: { RATE_LIMIT_STORE: "database", LOGIN_RATE_LIMIT_PER_IP: "3" } });
});
afterAll(async () => {
  await h.close();
});

describe("database rate-limit store", () => {
  it("counts hits within a window and starts a new window after it ends", async () => {
    const store = new DatabaseRateLimitStore(h.ctx.db, `test-${randomUUID()}`);
    store.init({ windowMs: 60_000 } as never);
    expect((await store.increment("k")).totalHits).toBe(1);
    expect((await store.increment("k")).totalHits).toBe(2);
    await store.decrement("k");
    const third = await store.increment("k");
    expect(third.totalHits).toBe(2);
    expect(third.resetTime!.getTime()).toBeGreaterThan(Date.now());

    // Expire the window: the next hit starts again at 1.
    await h.ctx.db
      .update(rateLimitHits)
      .set({ resetAt: new Date(Date.now() - 1_000) })
      .where(like(rateLimitHits.key, `${store.prefix}:%`));
    expect((await store.increment("k")).totalHits).toBe(1);
    await store.resetKey("k");
    expect(
      await h.ctx.db
        .select()
        .from(rateLimitHits)
        .where(eq(rateLimitHits.key, `${store.prefix}:k`)),
    ).toHaveLength(0);
  });

  it("shares the sign-in limit between two API instances", async () => {
    const instanceA = h.app;
    const instanceB = createApp(h.ctx);
    const login = (app: typeof instanceA) =>
      request(app)
        .post("/api/v1/auth/login")
        .set("X-Requested-With", "quartermaster")
        .send({ email: `nobody-${randomUUID()}@example.com`, password: "not-the-password" });
    const statuses = [];
    for (const app of [instanceA, instanceB, instanceA, instanceB]) statuses.push((await login(app)).status);
    // Three attempts per IP across both instances, then the fourth is refused.
    expect(statuses).toEqual([401, 401, 401, 429]);
  });

  it("purges expired counters in the sweeper", async () => {
    const key = `stale-${randomUUID()}`;
    await h.ctx.db.insert(rateLimitHits).values({ key, hits: 3, resetAt: new Date(Date.now() - 60 * 60_000) });
    await sweep(h.ctx);
    expect(await h.ctx.db.select().from(rateLimitHits).where(eq(rateLimitHits.key, key))).toHaveLength(0);
  });
});
