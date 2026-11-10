import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { knownLoginAddresses, users } from "@qm/database";
import { addressHash, login, MAX_FAILED_LOGINS } from "../../apps/api/src/services/auth";
import { AppError } from "../../apps/api/src/errors";
import { createHarness, type Harness } from "../helpers/harness";

/** Account abuse: link-shaped names, invitation floods, weak passwords, lockout DoS, idle sessions. */
let h: Harness;
const tokenIn = (text: string) => /#token=([\w-]+)/.exec(text)?.[1] ?? null;
const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));

async function signup(email: string, extra: Record<string, unknown> = {}) {
  const c = h.anonymous();
  const res = await c.post("/auth/signup", {
    name: "Pat Owner",
    email,
    password: "pats-strong-passphrase",
    organization_name: "Pat's Diner",
    sample_data: false,
    ...extra,
  });
  return { c, res };
}

beforeAll(async () => {
  h = await createHarness({ extraEnv: { INVITE_RATE_LIMIT_PER_HOUR: "3", INVITE_RATE_LIMIT_PER_DAY: "4", SESSION_IDLE_MINUTES: "30" } });
});
afterAll(async () => {
  await h.close();
});

describe("workspace and person names", () => {
  it.each(["https://paypal.com/verify", "www.paypal-support.net", "Secure-Login.com Billing", "evil.example.xyz/login"])(
    "refuses a workspace named %s",
    async (name) => {
      const { res } = await signup(`links-${Math.random().toString(36).slice(2)}@example.com`, { organization_name: name });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain("Names cannot contain web addresses");
    },
  );

  it("refuses an overlong workspace name and link-shaped person names, and accepts ordinary ones", async () => {
    expect((await signup("long@example.com", { organization_name: "x".repeat(81) })).res.status).toBe(400);
    expect((await signup("person@example.com", { name: "Visit www.example.com" })).res.status).toBe(400);
    expect((await signup("ok@example.com", { organization_name: "St. Louis Café & Bar" })).res.status).toBe(201);
  });
});

describe("invitation limits", () => {
  it("caps invitations per workspace per hour, and per day", async () => {
    const { c } = await signup("inviter@example.com");
    for (let i = 0; i < 3; i++)
      expect((await c.post("/members/invitations", { email: `guest${i}@example.com`, role: "VIEWER" })).status).toBe(201);
    const limited = await c.post("/members/invitations", { email: "guest9@example.com", role: "VIEWER" });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    // Another workspace has its own budget.
    const other = await signup("other-inviter@example.com");
    expect((await other.c.post("/members/invitations", { email: "guest@example.com", role: "VIEWER" })).status).toBe(201);
  });
});

describe("common passwords", () => {
  const WEAK = ["Password2026!", "qwertyuiop12", "123456789012", "aaaaaaaaaaaa"];

  it.each(WEAK)("refuses %s at sign-up with a clear reason", async (password) => {
    const { res } = await signup(`weak-${Math.random().toString(36).slice(2)}@example.com`, { password });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_TOO_COMMON");
    expect(res.body.error.message).toMatch(/too common or easy to guess/);
  });

  it("refuses a password built from the person's own email address", async () => {
    const { res } = await signup("morgan.lee@example.com", { password: "morganlee2026!!" });
    expect(res.body.error.code).toBe("PASSWORD_TOO_COMMON");
  });

  it("refuses weak passwords when changing, resetting and accepting an invitation", async () => {
    const { c } = await signup("strong@example.com");
    const change = await c.post("/auth/password/change", { current_password: "pats-strong-passphrase", new_password: "iloveyou2024!!" });
    expect(change.body.error.code).toBe("PASSWORD_TOO_COMMON");

    const invite = await c.post("/members/invitations", { email: "weak-invitee@example.com", role: "MANAGER" });
    const token = tokenIn(invite.body.invite_url as string)!;
    const accept = await h.anonymous().post("/invitations/accept", { token, name: "Weak Invitee", password: "sunshine12345" });
    expect(accept.body.error.code).toBe("PASSWORD_TOO_COMMON");
    // The link still works with a good password.
    const ok = await h.anonymous().post("/invitations/accept", { token, name: "Weak Invitee", password: "violet-harbor-lantern" });
    expect(ok.status).toBe(201);

    const members = (await c.get("/members")).body.members as { user_id: string; email: string }[];
    const invitee = members.find((m) => m.email === "weak-invitee@example.com")!;
    const link = await c.post(`/members/${invitee.user_id}/password-reset`);
    const reset = await h
      .anonymous()
      .post("/auth/password/reset", { token: tokenIn(link.body.reset_url as string)!, password: "Password123456" });
    expect(reset.body.error.code).toBe("PASSWORD_TOO_COMMON");
  });
});

describe("lockout cannot be turned against the owner", () => {
  it("ignores failures from addresses the user signed in from, and still lets those addresses in", async () => {
    await signup("locked-owner@example.com");
    const email = "locked-owner@example.com";
    const home = "198.51.100.20";
    await login(h.ctx, email, "pats-strong-passphrase", { ip: home });
    const [user] = await h.ctx.db.select().from(users).where(eq(users.email, email));
    const known = await h.ctx.db.select().from(knownLoginAddresses).where(eq(knownLoginAddresses.userId, user!.id));
    expect(known.map((k) => k.addressHash)).toEqual([addressHash(home)]);
    // The raw address is never stored.
    expect(JSON.stringify(known)).not.toContain(home);

    // The owner's own typos from home do not count towards the lock.
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await login(h.ctx, email, "typo-typo-typo", { ip: home }).catch(() => undefined);
    let [row] = await h.ctx.db.select().from(users).where(eq(users.id, user!.id));
    expect(row!.lockedUntil).toBeNull();

    // A distributed attacker locks the account for unknown addresses…
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      await login(h.ctx, email, "guess-guess-guess", { ip: `203.0.113.${i + 1}` }).catch(() => undefined);
    }
    [row] = await h.ctx.db.select().from(users).where(eq(users.id, user!.id));
    expect(row!.lockedUntil!.getTime()).toBeGreaterThan(h.clock.now.getTime());
    expect(await login(h.ctx, email, "pats-strong-passphrase", { ip: "203.0.113.200" }).then(() => "OK", code)).toBe("INVALID_CREDENTIALS");
    // …but the owner still signs in from home, and the lock stays for everyone else.
    expect(await login(h.ctx, email, "pats-strong-passphrase", { ip: home }).then(() => "OK", code)).toBe("OK");
    [row] = await h.ctx.db.select().from(users).where(eq(users.id, user!.id));
    expect(row!.lockedUntil).not.toBeNull();
  });
});

describe("idle sessions", () => {
  it("ends a session unused for SESSION_IDLE_MINUTES, while activity keeps it alive", async () => {
    const { c } = await signup("idle@example.com");
    const saved = h.clock.now;
    try {
      for (let i = 0; i < 4; i++) {
        h.clock.now = new Date(h.clock.now.getTime() + 20 * 60_000);
        expect((await c.get("/auth/me")).status).toBe(200);
      }
      h.clock.now = new Date(h.clock.now.getTime() + 31 * 60_000);
      const expired = await c.get("/auth/me");
      expect(expired.status).toBe(401);
      // Revoked, not just refused: coming back sooner does not revive it.
      h.clock.now = new Date(h.clock.now.getTime() - 10 * 60_000);
      expect((await c.get("/auth/me")).status).toBe(401);
    } finally {
      h.clock.now = saved;
    }
  });
});
