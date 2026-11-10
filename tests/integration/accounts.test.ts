import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DEMO_CREDENTIALS, inventoryItems, memberships, passwordResetTokens, sessions, spendMandates, users } from "@qm/database";
import { createHarness, PASSWORD, type Harness } from "../helpers/harness";

interface Sent {
  url: string;
  body: Record<string, unknown> | string;
}

/** Records email (Resend), alert webhook and Sentry calls instead of sending them. */
function outbox() {
  const calls: Sent[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof init?.body === "string" ? init.body : "";
    let body: Sent["body"] = raw;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* Sentry envelopes are newline-delimited, not one JSON document. */
    }
    calls.push({ url: String(input), body });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const emails = () =>
    calls.filter((c) => c.url.includes("api.resend.com")).map((c) => c.body as { to: string[]; subject: string; text: string });
  return { calls, fetch: fetchImpl, emails };
}

const tokenIn = (text: string) => /#token=([\w-]+)/.exec(text)?.[1] ?? null;

async function waitFor<T>(fn: () => T | undefined, ms = 3000): Promise<T> {
  const until = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v !== undefined) return v;
    if (Date.now() > until) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 20));
  }
}

const NEW_PASSWORD = "a-brand-new-password-2026";

describe("accounts: sign-up, invitations, password reset", () => {
  let h: Harness;
  const mail = outbox();

  beforeAll(async () => {
    h = await createHarness({
      monitoringFetch: mail.fetch,
      extraEnv: { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "Quartermaster <qm@example.com>", APP_BASE_URL: "https://app.example.com" },
    });
  });
  afterAll(async () => h.close());

  describe("sign-up", () => {
    it("creates a workspace with sample data and signs the owner in", async () => {
      const c = h.anonymous();
      const res = await c.post("/auth/signup", {
        name: "Ada Owner",
        email: "Ada@Example.com",
        password: "correct-horse-battery",
        organization_name: "Ada's Kitchen",
        timezone: "Europe/London",
        sample_data: true,
      });
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ email: "ada@example.com", role: "OWNER", operator: false });
      expect(res.body.user.organization).toMatchObject({ name: "Ada's Kitchen", timezone: "Europe/London" });

      const me = await c.get("/auth/me");
      expect(me.status).toBe(200);
      const inv = await c.get("/inventory");
      expect(inv.body.items).toHaveLength(5);
      const suppliers = await c.get("/suppliers");
      expect(suppliers.body.items.map((s: { name: string }) => s.name)).toContain("QuickServe Packaging Co.");
      // The new workspace is isolated from the shared sample workspace.
      const orgId = res.body.user.organization.id as string;
      const items = await h.ctx.db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, orgId));
      expect(items).toHaveLength(5);
    });

    it("starts an empty workspace with a conservative mandate when sample data is declined", async () => {
      const c = h.anonymous();
      const res = await c.post("/auth/signup", {
        name: "Bo Empty",
        email: "bo@example.com",
        password: "correct-horse-battery",
        organization_name: "Bo's Bakery",
        sample_data: false,
      });
      expect(res.status).toBe(201);
      expect((await c.get("/inventory")).body.items).toEqual([]);
      const mandate = await c.get("/mandates/current");
      expect(mandate.status).toBe(200);
      expect(mandate.body.mandate).toMatchObject({ version: 1, approved_supplier_ids: [], human_approval_required: true });
      const [row] = await h.ctx.db.select().from(spendMandates).where(eq(spendMandates.organizationId, res.body.user.organization.id));
      expect(row?.allowedCategories).not.toContain("alcohol");
    });

    it("refuses an address that already has an account, case-insensitively", async () => {
      const res = await h.anonymous().post("/auth/signup", {
        name: "Again",
        email: DEMO_CREDENTIALS.owner.email.toUpperCase(),
        password: "correct-horse-battery",
        organization_name: "Dup",
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_IN_USE");
    });

    it("validates passwords and time zones", async () => {
      const short = await h
        .anonymous()
        .post("/auth/signup", { name: "X", email: "x@example.com", password: "short", organization_name: "Xs" });
      expect(short.status).toBe(400);
      const tz = await h.anonymous().post("/auth/signup", {
        name: "X",
        email: "x@example.com",
        password: "correct-horse-battery",
        organization_name: "Xs",
        timezone: "Mars/Olympus",
      });
      expect(tz.status).toBe(400);
    });

    it("advertises sign-up and email in the public config", async () => {
      const res = await h.anonymous().get("/config/public");
      expect(res.body.accounts).toEqual({ signup_enabled: true, email_enabled: true });
    });
  });

  describe("invitations", () => {
    it("invites, previews and accepts; the link works once", async () => {
      const owner = await h.agent("owner");
      const created = await owner.post("/members/invitations", { email: "sam@example.com", role: "MANAGER" });
      expect(created.status).toBe(201);
      expect(created.body.email_sent).toBe(true);
      expect(created.body.invite_url).toMatch(/^https:\/\/app\.example\.com\/invite#token=/);
      const token = tokenIn(created.body.invite_url as string)!;
      const email = mail.emails().find((e) => e.to[0] === "sam@example.com");
      expect(email?.subject).toContain("Saffron & Sage Kitchen");
      expect(tokenIn(email!.text)).toBe(token);

      const anon = h.anonymous();
      const preview = await anon.post("/invitations/lookup", { token });
      expect(preview.status).toBe(200);
      expect(preview.body.invitation).toMatchObject({
        email: "sam@example.com",
        role: "MANAGER",
        organization_name: "Saffron & Sage Kitchen",
      });

      const accepted = await anon.post("/invitations/accept", { token, name: "Sam Manager", password: "sams-strong-password" });
      expect(accepted.status).toBe(201);
      expect(accepted.body.user).toMatchObject({ email: "sam@example.com", role: "MANAGER" });
      expect((await anon.get("/inventory")).status).toBe(200);

      const again = await h.anonymous().post("/invitations/accept", { token, name: "Eve", password: "eves-strong-password" });
      expect(again.status).toBe(404);
      expect(again.body.error.code).toBe("INVITATION_INVALID");

      const members = await owner.get("/members");
      expect(members.body.members.map((m: { email: string }) => m.email)).toContain("sam@example.com");
    });

    it("only owners invite, and existing accounts are refused", async () => {
      const manager = await h.agent("manager");
      expect((await manager.post("/members/invitations", { email: "z@example.com", role: "VIEWER" })).status).toBe(403);
      expect((await manager.get("/members")).body.invitations).toEqual([]);
      const owner = await h.agent("owner");
      const member = await owner.post("/members/invitations", { email: DEMO_CREDENTIALS.viewer.email, role: "VIEWER" });
      expect(member.body.error.code).toBe("ALREADY_MEMBER");
      const elsewhere = await owner.post("/members/invitations", { email: "ada@example.com", role: "VIEWER" });
      expect(elsewhere.body.error.code).toBe("EMAIL_IN_USE");
    });

    it("re-inviting replaces the old link, and revoked or expired links stop working", async () => {
      const owner = await h.agent("owner");
      const first = await owner.post("/members/invitations", { email: "kim@example.com", role: "VIEWER" });
      const second = await owner.post("/members/invitations", { email: "kim@example.com", role: "MANAGER" });
      const firstToken = tokenIn(first.body.invite_url as string)!;
      const secondToken = tokenIn(second.body.invite_url as string)!;
      expect((await h.anonymous().post("/invitations/lookup", { token: firstToken })).status).toBe(404);
      expect((await h.anonymous().post("/invitations/lookup", { token: secondToken })).body.invitation.role).toBe("MANAGER");

      const revoked = await owner.post(`/members/invitations/${second.body.invitation.id as string}/revoke`);
      expect(revoked.body.invitation.status).toBe("REVOKED");
      expect((await h.anonymous().post("/invitations/lookup", { token: secondToken })).status).toBe(404);

      const third = await owner.post("/members/invitations", { email: "lee@example.com", role: "VIEWER" });
      const saved = h.clock.now;
      h.clock.now = new Date(saved.getTime() + 8 * 86_400_000);
      try {
        expect((await h.anonymous().post("/invitations/lookup", { token: tokenIn(third.body.invite_url as string)! })).status).toBe(404);
      } finally {
        h.clock.now = saved;
      }
    });

    it("never accepts malformed tokens", async () => {
      expect((await h.anonymous().post("/invitations/lookup", { token: "../../etc/passwd" })).status).toBe(400);
    });
  });

  describe("roles and removal", () => {
    it("keeps at least one owner", async () => {
      const owner = await h.agent("owner");
      const [me] = await h.ctx.db.select().from(users).where(eq(users.email, DEMO_CREDENTIALS.owner.email));
      const res = await owner.put(`/members/${me!.id}/role`, { role: "MANAGER" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("LAST_OWNER");
      expect((await owner.post(`/members/${me!.id}/remove`)).body.error.code).toBe("CANNOT_REMOVE_SELF");
    });

    it("changes roles immediately and removal ends sessions and frees the address", async () => {
      const owner = await h.agent("owner");
      const invite = await owner.post("/members/invitations", { email: "temp@example.com", role: "VIEWER" });
      const temp = h.anonymous();
      const accepted = await temp.post("/invitations/accept", {
        token: tokenIn(invite.body.invite_url as string)!,
        name: "Temp",
        password: "temp-strong-password",
      });
      const userId = accepted.body.user.id as string;

      expect((await temp.post("/inventory/forecast", { demand_multiplier: 1 })).status).toBe(403);
      expect((await owner.put(`/members/${userId}/role`, { role: "MANAGER" })).body.member.role).toBe("MANAGER");
      expect((await temp.post("/inventory/forecast", { demand_multiplier: 1 })).status).toBe(200);

      expect((await owner.post(`/members/${userId}/remove`)).status).toBe(204);
      expect((await temp.get("/auth/me")).status).toBe(401);
      const [row] = await h.ctx.db.select().from(users).where(eq(users.id, userId));
      expect(row).toMatchObject({ disabled: true });
      expect(row!.email).toMatch(/@users\.invalid$/);
      expect(await h.ctx.db.select().from(memberships).where(eq(memberships.userId, userId))).toEqual([]);
      // The address can be invited again.
      expect((await owner.post("/members/invitations", { email: "temp@example.com", role: "VIEWER" })).status).toBe(201);
    });
  });

  describe("password reset", () => {
    it("emails a one-time link; using it changes the password and signs out everywhere", async () => {
      const before = mail.emails().length;
      const existing = await h.signIn("ada@example.com", "correct-horse-battery");
      const res = await h.anonymous().post("/auth/password/forgot", { email: "ada@example.com" });
      expect(res.status).toBe(202);
      const email = await waitFor(() =>
        mail
          .emails()
          .slice(before)
          .find((e) => e.to[0] === "ada@example.com"),
      );
      const token = tokenIn(email.text)!;
      expect(email.text).toContain("https://app.example.com/reset-password#token=");

      const reset = await h.anonymous().post("/auth/password/reset", { token, password: NEW_PASSWORD });
      expect(reset.status).toBe(200);
      expect((await existing.get("/auth/me")).status).toBe(401);
      await expect(h.signIn("ada@example.com", "correct-horse-battery")).rejects.toThrow(/401/);
      await h.signIn("ada@example.com", NEW_PASSWORD);

      const reuse = await h.anonymous().post("/auth/password/reset", { token, password: "yet-another-password" });
      expect(reuse.body.error.code).toBe("RESET_LINK_INVALID");
    });

    it("answers the same for unknown addresses and sends nothing", async () => {
      const before = mail.emails().length;
      const res = await h.anonymous().post("/auth/password/forgot", { email: "nobody@example.com" });
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ status: "sent" });
      await new Promise((r) => setTimeout(r, 100));
      expect(mail.emails().length).toBe(before);
    });

    it("expires links and only the newest link works", async () => {
      const [ada] = await h.ctx.db.select().from(users).where(eq(users.email, "ada@example.com"));
      const before = mail.emails().length;
      await h.anonymous().post("/auth/password/forgot", { email: "ada@example.com" });
      const first = await waitFor(() => mail.emails().slice(before)[0]);
      await waitFor(() => (mail.emails().length > before ? true : undefined));
      await h.anonymous().post("/auth/password/forgot", { email: "ada@example.com" });
      const second = await waitFor(() => mail.emails().slice(before)[1]);
      expect(
        (await h.anonymous().post("/auth/password/reset", { token: tokenIn(first.text)!, password: "first-link-password" })).status,
      ).toBe(400);

      const saved = h.clock.now;
      h.clock.now = new Date(saved.getTime() + 61 * 60_000);
      try {
        const late = await h.anonymous().post("/auth/password/reset", { token: tokenIn(second.text)!, password: "second-link-password" });
        expect(late.body.error.code).toBe("RESET_LINK_INVALID");
      } finally {
        h.clock.now = saved;
      }
      const live = await h.ctx.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, ada!.id));
      expect(live.filter((t) => !t.usedAt)).toHaveLength(1);
    });

    it("lets an owner issue a reset link for a member, which also clears a lockout", async () => {
      const owner = await h.agent("owner");
      const [viewer] = await h.ctx.db.select().from(users).where(eq(users.email, DEMO_CREDENTIALS.viewer.email));
      await h.ctx.db
        .update(users)
        .set({ lockedUntil: new Date(h.clock.now.getTime() + 3_600_000) })
        .where(eq(users.id, viewer!.id));
      const link = await owner.post(`/members/${viewer!.id}/password-reset`);
      expect(link.status).toBe(200);
      expect(link.body.email_sent).toBe(true);
      const manager = await h.agent("manager");
      expect((await manager.post(`/members/${viewer!.id}/password-reset`)).status).toBe(403);

      await h.anonymous().post("/auth/password/reset", { token: tokenIn(link.body.reset_url as string)!, password: NEW_PASSWORD });
      await h.signIn(DEMO_CREDENTIALS.viewer.email, NEW_PASSWORD);
      // Restore for other tests in this file.
      const again = await owner.post(`/members/${viewer!.id}/password-reset`);
      await h.anonymous().post("/auth/password/reset", { token: tokenIn(again.body.reset_url as string)!, password: PASSWORD });
    });

    it("changes the password when the current one is right and signs out other sessions", async () => {
      const a = await h.signIn("bo@example.com", "correct-horse-battery");
      const b = await h.signIn("bo@example.com", "correct-horse-battery");
      const wrong = await a.post("/auth/password/change", { current_password: "nope-nope-nope", new_password: NEW_PASSWORD });
      expect(wrong.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
      const ok = await a.post("/auth/password/change", { current_password: "correct-horse-battery", new_password: NEW_PASSWORD });
      expect(ok.status).toBe(200);
      expect((await a.get("/auth/me")).status).toBe(200);
      expect((await b.get("/auth/me")).status).toBe(401);
      const [bo] = await h.ctx.db.select().from(users).where(eq(users.email, "bo@example.com"));
      const open = await h.ctx.db.select().from(sessions).where(eq(sessions.userId, bo!.id));
      expect(open.filter((s) => !s.revokedAt)).toHaveLength(1);
    });
  });
});

describe("accounts without email or sign-up", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness({ extraEnv: { SIGNUP_ENABLED: "false" } });
  });
  afterAll(async () => h.close());

  it("refuses sign-up and still returns invitation links", async () => {
    const res = await h.anonymous().post("/auth/signup", {
      name: "N",
      email: "n@example.com",
      password: "correct-horse-battery",
      organization_name: "Nope",
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SIGNUP_DISABLED");
    const owner = await h.agent("owner");
    const invite = await owner.post("/members/invitations", { email: "m@example.com", role: "VIEWER" });
    expect(invite.status).toBe(201);
    expect(invite.body.email_sent).toBe(false);
    expect((await h.anonymous().get("/config/public")).body.accounts).toEqual({ signup_enabled: false, email_enabled: false });
  });
});
