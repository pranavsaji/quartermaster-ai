import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Role, SessionUser } from "@qm/contracts";
import { dummyPasswordHash, memberships, organizations, sessions, users, verifyPassword, type DbOrTx } from "@qm/database";
import type { AppContext } from "../context";
import { AppError } from "../errors";
import { appendAudit } from "./audit";

/**
 * Account-wide lockout is a backstop against distributed guessing. Ordinary brute force is
 * stopped earlier by the per-IP+email limiter (10 per 15 minutes), which only slows the attacker's
 * own address; a low account-wide threshold would let anyone lock the owner out of approvals.
 */
export const MAX_FAILED_LOGINS = 25;
const LOCKOUT_MINUTES = 15;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  sessionId: string;
  operator: boolean;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verifies credentials and opens a session. Unknown users, disabled users, wrong passwords and
 * locked accounts all get the same 401 after the same password-hash work, so neither the
 * response nor its timing reveals whether an account exists or is locked. (A locked account
 * refuses even the correct password until the lock expires; the message says so generically.)
 * MAX_FAILED_LOGINS consecutive failures lock the account for LOCKOUT_MINUTES.
 */
export async function login(ctx: AppContext, email: string, password: string, meta: SessionMeta) {
  const now = ctx.now();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  const invalid = new AppError(
    401,
    "INVALID_CREDENTIALS",
    "Email or password is incorrect, or sign-in is temporarily locked after repeated failures.",
  );
  if (!user || user.disabled) {
    await verifyPassword(password, await dummyPasswordHash());
    throw invalid;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (user.lockedUntil && user.lockedUntil > now) throw invalid;
  if (!ok) {
    // One atomic statement, so concurrent failures cannot overwrite each other's count or
    // clear a lock another request just set. SET expressions all see the pre-update row.
    const lockUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60_000);
    const reachesLimit = sql`${users.failedLogins} + 1 >= ${MAX_FAILED_LOGINS}`;
    await ctx.db
      .update(users)
      .set({
        failedLogins: sql`case when ${reachesLimit} then 0 else ${users.failedLogins} + 1 end`,
        lockedUntil: sql`case when ${reachesLimit} then ${lockUntil.toISOString()}::timestamptz else ${users.lockedUntil} end`,
      })
      .where(eq(users.id, user.id));
    throw invalid;
  }

  const [membership] = await ctx.db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .orderBy(memberships.createdAt)
    .limit(1);
  if (!membership) throw invalid;

  const session = await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
    const opened = await openSession(ctx, tx, { userId: user.id, organizationId: membership.organizationId, meta });
    await appendAudit(tx, {
      organizationId: membership.organizationId,
      action: "auth.login",
      actorType: "USER",
      actorId: user.id,
      entityType: "user",
      entityId: user.id,
      data: { ip: meta.ip ?? null },
    });
    return opened;
  });
  return { ...session, user: await sessionUser(ctx, user.id, membership.organizationId) };
}

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

/** A new random token for a one-time link or a session. Only its SHA-256 is ever stored. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Creates a session row inside the caller's transaction and returns the cookie token. */
export async function openSession(
  ctx: AppContext,
  tx: DbOrTx,
  args: { userId: string; organizationId: string; meta: SessionMeta },
): Promise<{ token: string; expiresAt: Date }> {
  const now = ctx.now();
  const token = newToken();
  const expiresAt = new Date(now.getTime() + ctx.config.session.ttlHours * 3_600_000);
  await tx.insert(sessions).values({
    tokenHash: hashToken(token),
    userId: args.userId,
    organizationId: args.organizationId,
    expiresAt,
    // Timestamps come from the application clock, the same clock the session checks use.
    createdAt: now,
    lastSeenAt: now,
    userAgent: args.meta.userAgent?.slice(0, 300) ?? null,
    ip: args.meta.ip ?? null,
  });
  return { token, expiresAt };
}

export async function sessionUser(ctx: AppContext, userId: string, organizationId: string): Promise<SessionUser> {
  const [row] = await ctx.db
    .select({ user: users, role: memberships.role, org: organizations })
    .from(users)
    .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.organizationId, organizationId)))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(users.id, userId));
  if (!row) throw new AppError(401, "UNAUTHENTICATED", "Session is no longer valid.");
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.role,
    organization: { id: row.org.id, name: row.org.name, timezone: row.org.timezone, currency: row.org.currency },
    operator: isOperator(ctx, row.user),
  };
}

/**
 * Platform operators: accounts the deploy-time seed created with the operator flag, whose address
 * is still listed in OPERATOR_EMAILS (removing it from the list revokes access).
 */
export function isOperator(ctx: AppContext, user: { email: string; operator: boolean }): boolean {
  return user.operator && ctx.config.monitoring.operatorEmails.includes(user.email.toLowerCase());
}

/** Resolves a session token to the user and their role in the session's organization. */
export async function authenticate(ctx: AppContext, token: string): Promise<AuthenticatedUser | null> {
  const now = ctx.now();
  const [row] = await ctx.db
    .select({ session: sessions, user: users, role: memberships.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(memberships, and(eq(memberships.userId, sessions.userId), eq(memberships.organizationId, sessions.organizationId)))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)));
  if (!row || row.user.disabled) return null;
  // Touch at most once a minute to avoid a write per request.
  if (now.getTime() - row.session.lastSeenAt.getTime() > 60_000) {
    await ctx.db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.session.id));
  }
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.role,
    organizationId: row.session.organizationId,
    sessionId: row.session.id,
    operator: isOperator(ctx, row.user),
  };
}

export async function logout(ctx: AppContext, sessionId: string): Promise<void> {
  await ctx.db.update(sessions).set({ revokedAt: ctx.now() }).where(eq(sessions.id, sessionId));
}
