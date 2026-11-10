import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import type { ChangePasswordRequest, ResetLinkResponse, ResetPasswordRequest, SignupRequest } from "@qm/contracts";
import {
  auditEvents,
  hashPassword,
  invitations,
  insertStarterMandate,
  memberships,
  organizations,
  passwordResetTokens,
  seedSampleWorkspace,
  sessions,
  users,
  verifyPassword,
  type DbOrTx,
} from "@qm/database";
import type { AppContext } from "../../context";
import { AppError, conflict, notFound } from "../../errors";
import { appendAudit } from "../audit";
import { hashToken, newToken, openSession, sessionUser, type SessionMeta } from "../auth";
import { linkWithToken, passwordResetEmail } from "./emails";

export type UserRow = typeof users.$inferSelect;

export async function findUserByEmail(db: DbOrTx, email: string): Promise<UserRow | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`);
  return user ?? null;
}

/** Operator addresses are reserved for accounts the deploy-time seed creates. */
export function isReservedAddress(ctx: AppContext, email: string): boolean {
  return ctx.config.monitoring.operatorEmails.includes(email.trim().toLowerCase());
}

export const emailInUse = () =>
  conflict("EMAIL_IN_USE", "An account with this email already exists. Sign in, or reset your password if you have forgotten it.");

/**
 * Creates a workspace (organisation), its first owner and Spend Mandate v1, optionally with the
 * labelled sample data, and signs the owner in. Everything happens in one transaction.
 */
export async function signup(ctx: AppContext, input: SignupRequest, meta: SessionMeta) {
  if (!ctx.config.accounts.signupEnabled) throw new AppError(403, "SIGNUP_DISABLED", "Sign-up is closed on this deployment.");
  const passwordHash = await hashPassword(input.password);
  const now = ctx.now();
  const out = await ctx.db.transaction(async (tx) => {
    if (isReservedAddress(ctx, input.email) || (await findUserByEmail(tx, input.email))) throw emailInUse();
    const [org] = await tx
      .insert(organizations)
      .values({ name: input.organization_name, timezone: input.timezone, currency: "USD" })
      .returning();
    const [user] = await tx.insert(users).values({ email: input.email, name: input.name, passwordHash, createdAt: now }).returning();
    await tx.insert(memberships).values({ organizationId: org!.id, userId: user!.id, role: "OWNER", createdAt: now });
    if (input.sample_data) await seedSampleWorkspace(tx, { organizationId: org!.id, ownerId: user!.id, now });
    else await insertStarterMandate(tx, { organizationId: org!.id, ownerId: user!.id, currency: org!.currency });
    await appendAudit(tx, {
      organizationId: org!.id,
      action: "organization.created",
      actorType: "USER",
      actorId: user!.id,
      entityType: "organization",
      entityId: org!.id,
      data: { sample_data: input.sample_data, timezone: input.timezone, ip: meta.ip ?? null },
    });
    const session = await openSession(ctx, tx, { userId: user!.id, organizationId: org!.id, meta });
    return { session, userId: user!.id, organizationId: org!.id };
  });
  return { ...out.session, user: await sessionUser(ctx, out.userId, out.organizationId) };
}

/** Organisations the user belongs to (used to audit account-level events in each). */
async function organizationsOf(db: DbOrTx, userId: string): Promise<string[]> {
  const rows = await db.select({ id: memberships.organizationId }).from(memberships).where(eq(memberships.userId, userId));
  return rows.map((r) => r.id);
}

/** Issues a reset token for a user, invalidating any earlier unused ones. Returns the raw token. */
async function issueResetToken(
  ctx: AppContext,
  tx: DbOrTx,
  userId: string,
  issuedBy: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const now = ctx.now();
  await tx
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  const token = newToken();
  const expiresAt = new Date(now.getTime() + ctx.config.accounts.passwordResetTtlMinutes * 60_000);
  await tx.insert(passwordResetTokens).values({ userId, tokenHash: hashToken(token), issuedBy, expiresAt, createdAt: now });
  return { token, expiresAt };
}

/**
 * Self-service reset. The response never says whether the address has an account, and the email
 * is sent after the response is decided (not awaited), so timing does not reveal it either.
 */
export async function requestPasswordReset(ctx: AppContext, email: string): Promise<void> {
  if (!ctx.mailer.enabled) return;
  const user = await findUserByEmail(ctx.db, email);
  if (!user || user.disabled) return;
  const orgs = await organizationsOf(ctx.db, user.id);
  if (orgs.length === 0) return;
  const { token, expiresAt } = await ctx.db.transaction(async (tx) => {
    const issued = await issueResetToken(ctx, tx, user.id, null);
    for (const organizationId of orgs) {
      await appendAudit(tx, {
        organizationId,
        action: "auth.password_reset_requested",
        actorType: "USER",
        actorId: user.id,
        entityType: "user",
        entityId: user.id,
        data: {},
      });
    }
    return issued;
  });
  void ctx.mailer.send(
    passwordResetEmail({
      to: user.email,
      url: linkWithToken(ctx.config.appBaseUrl, "/reset-password", token),
      expiresAt,
      issuedByOwner: false,
    }),
  );
}

const invalidResetLink = () =>
  new AppError(400, "RESET_LINK_INVALID", "This reset link is invalid, has already been used or has expired. Request a new one.");

/** Sets a new password from a one-time link, clears any lockout and signs the user out everywhere. */
export async function resetPassword(ctx: AppContext, input: ResetPasswordRequest): Promise<void> {
  const passwordHash = await hashPassword(input.password);
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    const [token] = await tx
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashToken(input.token)))
      .for("update");
    if (!token || token.usedAt || token.expiresAt <= now) throw invalidResetLink();
    const [user] = await tx.select().from(users).where(eq(users.id, token.userId)).for("update");
    if (!user || user.disabled) throw invalidResetLink();
    await tx.update(users).set({ passwordHash, failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
    for (const organizationId of await organizationsOf(tx, user.id)) {
      await appendAudit(tx, {
        organizationId,
        action: "auth.password_reset",
        actorType: "USER",
        actorId: user.id,
        entityType: "user",
        entityId: user.id,
        data: { method: token.issuedBy ? "OWNER_LINK" : "EMAIL_LINK" },
      });
    }
  });
}

/** Changes the signed-in user's password and signs out their other sessions. */
export async function changePassword(
  ctx: AppContext,
  actor: { id: string; organizationId: string; sessionId: string },
  input: ChangePasswordRequest,
): Promise<void> {
  const [user] = await ctx.db.select().from(users).where(eq(users.id, actor.id));
  if (!user || !(await verifyPassword(input.current_password, user.passwordHash))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Your current password is incorrect.");
  }
  if (input.current_password === input.new_password) {
    throw new AppError(400, "PASSWORD_UNCHANGED", "Choose a password different from your current one.");
  }
  const passwordHash = await hashPassword(input.new_password);
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), ne(sessions.id, actor.sessionId)));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "auth.password_changed",
      actorType: "USER",
      actorId: user.id,
      entityType: "user",
      entityId: user.id,
      data: {},
    });
  });
}

/**
 * Whether the user has ever held the owner role in the organisation: founded it, joined through an
 * owner invitation, or had a role change to or from owner. Read from the append-only audit log and
 * invitations, which the owner cannot rewrite.
 */
export async function everOwner(db: DbOrTx, organizationId: string, userId: string): Promise<boolean> {
  const [audited] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organizationId, organizationId),
        or(
          and(eq(auditEvents.action, "organization.created"), eq(auditEvents.actorId, userId)),
          and(
            eq(auditEvents.action, "member.role_changed"),
            eq(auditEvents.entityId, userId),
            or(sql`${auditEvents.data}->>'from' = 'OWNER'`, sql`${auditEvents.data}->>'to' = 'OWNER'`),
          ),
        ),
      ),
    )
    .limit(1);
  if (audited) return true;
  const [invited] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.organizationId, organizationId), eq(invitations.acceptedBy, userId), eq(invitations.role, "OWNER")))
    .limit(1);
  return Boolean(invited);
}

/**
 * An owner issues a one-time reset link for a member of their workspace (works without email;
 * emailed too when email is configured). The member's password is unchanged until the link is used.
 */
export async function issueMemberResetLink(
  ctx: AppContext,
  actor: { id: string; organizationId: string },
  memberUserId: string,
): Promise<ResetLinkResponse> {
  const [member] = await ctx.db
    .select({ user: users, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, memberUserId)));
  if (!member || member.user.disabled) throw notFound("Member");
  // A reset link takes over the account it names. Owners may issue one only for members who have
  // never been an owner of this workspace (so demoting a co-owner first does not help) and are
  // not operators; everyone else resets their own password by email.
  if (member.role === "OWNER" || member.user.operator || (await everOwner(ctx.db, actor.organizationId, memberUserId))) {
    throw new AppError(403, "RESET_LINK_NOT_ALLOWED", "Owners reset their own password with “Forgot password” or from their account page.");
  }
  const { token, expiresAt } = await ctx.db.transaction(async (tx) => {
    const issued = await issueResetToken(ctx, tx, memberUserId, actor.id);
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "member.password_reset_issued",
      actorType: "USER",
      actorId: actor.id,
      entityType: "user",
      entityId: memberUserId,
      data: {},
    });
    return issued;
  });
  const url = linkWithToken(ctx.config.appBaseUrl, "/reset-password", token);
  const sent = await ctx.mailer.send(passwordResetEmail({ to: member.user.email, url, expiresAt, issuedByOwner: true }));
  // When the member received it by email, the owner never sees the link itself.
  return { reset_url: sent.sent ? null : url, expires_at: expiresAt.toISOString(), email_sent: sent.sent };
}
