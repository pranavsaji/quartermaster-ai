import { Writable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { DEMO_CREDENTIALS, idempotencyKeys, memberships, users } from "@qm/database";
import { idempotent } from "../../apps/api/src/http/middleware/idempotency";
import { createLogger } from "../../apps/api/src/logger";
import { createHarness, type Harness } from "../helpers/harness";

type Middleware = ReturnType<typeof idempotent>;
type Request = Parameters<Middleware>[0];
type Response = Parameters<Middleware>[1];
type NextFunction = Parameters<Middleware>[2];

let h: Harness;
let user: { id: string; organizationId: string };

beforeAll(async () => {
  h = await createHarness();
  const [u] = await h.ctx.db.select().from(users).where(eq(users.email, DEMO_CREDENTIALS.owner.email));
  const [m] = await h.ctx.db.select().from(memberships).where(eq(memberships.userId, u!.id));
  user = { id: u!.id, organizationId: m!.organizationId };
});
afterAll(async () => {
  await h.close();
});

function capturingContext() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      for (const l of String(chunk).split("\n").filter(Boolean)) lines.push(JSON.parse(l) as Record<string, unknown>);
      done();
    },
  });
  return { ctx: { ...h.ctx, log: createLogger("info", stream) }, lines };
}

function invoke(mw: ReturnType<typeof idempotent>, key: string) {
  const req = { get: (n: string) => (n.toLowerCase() === "idempotency-key" ? key : undefined), user, method: "POST", params: {}, body: { a: 1 } } as unknown as Request;
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status(s: number) {
      sent.status = s;
      return this;
    },
    json(b: unknown) {
      sent.body = b;
      return this;
    },
    setHeader: () => undefined,
  } as unknown as Response;
  return new Promise<typeof sent>((resolve, reject) => {
    const next: NextFunction = (err?: unknown) => (err ? reject(err) : resolve(sent));
    void mw(req, res, next).then(() => resolve(sent));
  });
}

describe("idempotency lease", () => {
  it("logs at error level, but still responds, when the lease was lost to a stale takeover", async () => {
    const { ctx, lines } = capturingContext();
    const key = "lost-lease-key-0001";
    const mw = idempotent(ctx, "test.lost_lease", async () => {
      // Simulate a concurrent retry that judged this execution stale and took the key over.
      await h.ctx.db
        .update(idempotencyKeys)
        .set({ createdAt: new Date(h.clock.now.getTime() + 1_000) })
        .where(and(eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key)));
      return { status: 201, body: { done: true } };
    });
    const sent = await invoke(mw, key);
    expect(sent).toEqual({ status: 201, body: { done: true } });
    const entry = lines.find((l) => l.msg === "idempotency lease lost before completion; response not stored");
    expect(entry).toMatchObject({ level: 50, idempotency_key: key, route: "test.lost_lease", status: 201 });
    const [row] = await h.ctx.db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key)));
    expect(row!.status).toBe("IN_PROGRESS");
  });

  it("stores the response without logging when the lease is intact", async () => {
    const { ctx, lines } = capturingContext();
    const key = "kept-lease-key-0001";
    const sent = await invoke(idempotent(ctx, "test.kept_lease", async () => ({ status: 200, body: { ok: 1 } })), key);
    expect(sent.status).toBe(200);
    expect(lines.filter((l) => (l.level as number) >= 50)).toEqual([]);
    const [row] = await h.ctx.db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key)));
    expect(row!.status).toBe("COMPLETED");
  });
});
