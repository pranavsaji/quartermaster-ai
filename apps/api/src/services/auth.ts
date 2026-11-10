import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Role, SessionUser } from "@qm/contracts";
import {
  dummyPasswordHash,
  knownLoginAddresses,
  memberships,
  organizations,
  sessions,
  users,
  verifyPassword,
  type DbOrTx,
} from "@qm/database";
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
/** How long a successful sign-in keeps its client address "known" to the lockout. */
const KNOWN_ADDRESS_DAYS = 90;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  sessionId: string;
  operator: boolean;
  /** The session's organisation is the shared sample workspace (organizations.is_sample). */
  sampleWorkspace: boolean;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The stored form of a client address for the lockout (never the raw IP). */
export function addressHash(ip: string | undefined): string | null {
  return ip ? createHash("sha256").update(`qm-login-address:${ip}`).digest("hex") : null;
}

/** Whether the user signed in successfully from this client address within KNOWN_ADDRESS_DAYS. */
async function isKnownAddress(ctx: AppContext, userId: string, ip: string | undefined): Promise<boolean> {
  const hash = addressHash(ip);
  if (!hash) return false;
  const since = new Date(ctx.now().getTime() - KNOWN_ADDRESS_DAYS * 86_400_000);
  const [row] = await ctx.db
    .select({ userId: knownLoginAddresses.userId })
    .from(knownLoginAddresses)
    .where(
      and(eq(knownLoginAddresses.userId, userId), eq(knownLoginAddresses.addressHash, hash), gt(knownLoginAddresses.lastSuccessAt, since)),
    );
  return Boolean(row);
}

/** Whether the user belongs to the shared sample workspace while it is read-only (published sign-ins). */
export async function inReadOnlySample(ctx: AppContext, db: DbOrTx, userId: string): Promise<boolean> {
  if (!ctx.config.security.sampleReadOnly) return false;
  const [row] = await db
    .select({ id: organizations.id })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), eq(organizations.isSample, true)))
    .limit(1);
  return Boolean(row);
}

/**
 * Verifies credentials and opens a session. Unknown users, disabled users, wrong passwords and
 * locked accounts all get the same 401 after the same password-hash work, so neither the
 * response nor its timing reveals whether an account exists or is locked. (A locked account
 * refuses even the correct password until the lock expires; the message says so generically.)
 * MAX_FAILED_LOGINS consecutive failures lock the account for LOCKOUT_MINUTES.
 *
 * The lock is aimed at distributed guessing, so it cannot be turned against the owner: failures
 * from a client address the user has signed in from before do not count, and the lock does not
 * refuse such an address (the per-IP+email limiter still bounds guessing from it). The shared
 * sample workspace's published accounts are never locked; the per-IP limiters still apply.
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
  const [ok, known] = await Promise.all([verifyPassword(password, user.passwordHash), isKnownAddress(ctx, user.id, meta.ip)]);
  if (user.lockedUntil && user.lockedUntil > now && !known) throw invalid;
  if (!ok) {
    if (!known && !(await inReadOnlySample(ctx, ctx.db, user.id))) await recordFailedPassword(ctx, user.id);
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
    // A success from an address while the account is locked (a known address) keeps the lock
    // for everyone else; any other success clears it.
    const lockActive = Boolean(user.lockedUntil && user.lockedUntil > now);
    await tx
      .update(users)
      .set(lockActive ? { failedLogins: 0 } : { failedLogins: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
    const hash = addressHash(meta.ip);
    if (hash) {
      await tx
        .insert(knownLoginAddresses)
        .values({ userId: user.id, addressHash: hash, lastSuccessAt: now })
        .onConflictDoUpdate({ target: [knownLoginAddresses.userId, knownLoginAddresses.addressHash], set: { lastSuccessAt: now } });
    }
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

/**
 * Counts a wrong password against the account (sign-in and password change share the counter);
 * MAX_FAILED_LOGINS in a row lock it for LOCKOUT_MINUTES. One atomic statement, so concurrent
 * failures cannot overwrite each other's count or clear a lock another request just set (SET
 * expressions all see the pre-update row).
 */
export async function recordFailedPassword(ctx: AppContext, userId: string): Promise<void> {
  const lockUntil = new Date(ctx.now().getTime() + LOCKOUT_MINUTES * 60_000);
  const reachesLimit = sql`${users.failedLogins} + 1 >= ${MAX_FAILED_LOGINS}`;
  await ctx.db
    .update(users)
    .set({
      failedLogins: sql`case when ${reachesLimit} then 0 else ${users.failedLogins} + 1 end`,
      lockedUntil: sql`case when ${reachesLimit} then ${lockUntil.toISOString()}::timestamptz else ${users.lockedUntil} end`,
    })
    .where(eq(users.id, userId));
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
    organization: {
      id: row.org.id,
      name: row.org.name,
      timezone: row.org.timezone,
      currency: row.org.currency,
      read_only_sample: row.org.isSample && ctx.config.security.sampleReadOnly,
    },
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

/**
 * Resolves a session token to the user and their role in the session's organization. A session
 * unused for SESSION_IDLE_MINUTES is ended (revoked) here, on its next use.
 */
export async function authenticate(ctx: AppContext, token: string): Promise<AuthenticatedUser | null> {
  const now = ctx.now();
  const [row] = await ctx.db
    .select({ session: sessions, user: users, role: memberships.role, sample: organizations.isSample })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(memberships, and(eq(memberships.userId, sessions.userId), eq(memberships.organizationId, sessions.organizationId)))
    .innerJoin(organizations, eq(organizations.id, sessions.organizationId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)));
  if (!row || row.user.disabled) return null;
  const idleMs = ctx.config.security.sessionIdleMinutes * 60_000;
  if (idleMs > 0 && now.getTime() - row.session.lastSeenAt.getTime() > idleMs) {
    await ctx.db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, row.session.id));
    return null;
  }
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
    sampleWorkspace: row.sample,
  };
}

export async function logout(ctx: AppContext, sessionId: string): Promise<void> {
  await ctx.db.update(sessions).set({ revokedAt: ctx.now() }).where(eq(sessions.id, sessionId));
}
