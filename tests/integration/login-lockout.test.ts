import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import request from "supertest";
import { DEMO_CREDENTIALS, users } from "@qm/database";
import { login } from "../../apps/api/src/services/auth";
import { AppError } from "../../apps/api/src/errors";
import { MAX_FAILED_LOGINS } from "../../apps/api/src/services/auth";
import { createHarness, PASSWORD, type Harness } from "../helpers/harness";

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

const attempt = (email: string, password: string) =>
  login(h.ctx, email, password, {}).then(
    () => "OK",
    (e: unknown) => (e instanceof AppError ? `${e.status} ${e.code}` : String(e)),
  );

const httpLogin = (email: string, password: string) =>
  request(h.app).post("/api/v1/auth/login").set("X-Requested-With", "quartermaster").send({ email, password });

describe("sign-in lockout", () => {
  it("counts concurrent failures atomically and locks the account", async () => {
    const email = DEMO_CREDENTIALS.manager.email;
    const results = await Promise.all(Array.from({ length: MAX_FAILED_LOGINS }, () => attempt(email, "wrong-password-xyz")));
    expect(results.every((r) => r === "401 INVALID_CREDENTIALS")).toBe(true);
    const [row] = await h.ctx.db.select().from(users).where(eq(users.email, email));
    // With a read-modify-write counter, parallel failures each wrote 1 and nothing locked.
    expect(row!.lockedUntil!.getTime()).toBeGreaterThan(h.clock.now.getTime());
    expect(row!.failedLogins).toBe(0);
    // Even the right password is refused while locked.
    expect(await attempt(email, PASSWORD)).toBe("401 INVALID_CREDENTIALS");
  });

  it("does not lose a lock to a slower concurrent failure", async () => {
    const email = DEMO_CREDENTIALS.viewer.email;
    await Promise.all(Array.from({ length: 2 * MAX_FAILED_LOGINS - 1 }, () => attempt(email, "wrong-password-xyz")));
    const [row] = await h.ctx.db.select().from(users).where(eq(users.email, email));
    expect(row!.lockedUntil).not.toBeNull();
    expect(row!.lockedUntil!.getTime()).toBeGreaterThan(h.clock.now.getTime());
  });

  it("answers a locked account exactly like an unknown email", async () => {
    const locked = await httpLogin(DEMO_CREDENTIALS.manager.email, PASSWORD);
    const unknown = await httpLogin("nobody-here@example.com", PASSWORD);
    expect(locked.status).toBe(401);
    expect(unknown.status).toBe(401);
    const strip = (b: { error: Record<string, unknown> }) => ({ ...b.error, correlation_id: undefined });
    expect(strip(locked.body)).toEqual(strip(unknown.body));
  });

  it("lets the user back in once the lock expires", async () => {
    h.clock.now = new Date(h.clock.now.getTime() + 16 * 60_000);
    expect(await attempt(DEMO_CREDENTIALS.manager.email, PASSWORD)).toBe("OK");
  });
});
