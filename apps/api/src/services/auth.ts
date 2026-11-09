import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Role, SessionUser } from "@qm/contracts";
import { dummyPasswordHash, memberships, organizations, sessions, users, verifyPassword } from "@qm/database";
import type { AppContext } from "../context";
import { AppError } from "../errors";
import { appendAudit } from "./audit";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  sessionId: string;
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
export async function login(ctx: AppContext, email: string, password: string, meta: { ip?: string; userAgent?: string }) {
  const now = ctx.now();
  const [user] = await ctx.db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  const invalid = new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect, or sign-in is temporarily locked after repeated failures.");
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

  const [membership] = await ctx.db.select().from(memberships).where(eq(memberships.userId, user.id)).orderBy(memberships.createdAt).limit(1);
  if (!membership) throw invalid;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + ctx.config.session.ttlHours * 3_600_000);
  await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
    await tx.insert(sessions).values({
      tokenHash: hashToken(token),
      userId: user.id,
      organizationId: membership.organizationId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ip: meta.ip ?? null,
    });
    await appendAudit(tx, { organizationId: membership.organizationId, action: "auth.login", actorType: "USER", actorId: user.id, entityType: "user", entityId: user.id, data: { ip: meta.ip ?? null } });
  });
  return { token, expiresAt, user: await sessionUser(ctx, user.id, membership.organizationId) };
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
  };
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
  return { id: row.user.id, email: row.user.email, name: row.user.name, role: row.role, organizationId: row.session.organizationId, sessionId: row.session.id };
}

export async function logout(ctx: AppContext, sessionId: string): Promise<void> {
  await ctx.db.update(sessions).set({ revokedAt: ctx.now() }).where(eq(sessions.id, sessionId));
}
