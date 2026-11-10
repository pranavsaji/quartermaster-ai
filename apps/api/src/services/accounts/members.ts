import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type {
  AcceptInvitationRequest,
  CreateInvitationRequest,
  InvitationCreatedResponse,
  InvitationDto,
  InvitationPreviewDto,
  InvitationStatus,
  MemberDto,
  MembersResponse,
  Role,
} from "@qm/contracts";
import { hashPassword, invitations, memberships, organizations, sessions, users, type DbOrTx } from "@qm/database";
import type { AppContext } from "../../context";
import { AppError, conflict, notFound } from "../../errors";
import { appendAudit } from "../audit";
import { hashToken, newToken, openSession, sessionUser, type SessionMeta } from "../auth";
import { emailInUse, findUserByEmail } from "./accounts";
import { invitationEmail, linkWithToken } from "./emails";

type InvitationRow = typeof invitations.$inferSelect;

export function invitationStatus(row: InvitationRow, now: Date): InvitationStatus {
  if (row.acceptedAt) return "ACCEPTED";
  if (row.revokedAt) return "REVOKED";
  return row.expiresAt <= now ? "EXPIRED" : "PENDING";
}

function toInvitationDto(row: InvitationRow, invitedByName: string | null, now: Date): InvitationDto {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: invitationStatus(row, now),
    invited_by_name: invitedByName,
    created_at: row.createdAt.toISOString(),
    expires_at: row.expiresAt.toISOString(),
  };
}

export async function listMembers(ctx: AppContext, actor: { id: string; organizationId: string; role: Role }): Promise<MembersResponse> {
  const rows = await ctx.db
    .select({ user: users, role: memberships.role, joinedAt: memberships.createdAt })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, actor.organizationId))
    .orderBy(memberships.createdAt);
  const members: MemberDto[] = rows.map((r) => ({
    user_id: r.user.id,
    email: r.user.email,
    name: r.user.name,
    role: r.role,
    joined_at: r.joinedAt.toISOString(),
    is_self: r.user.id === actor.id,
  }));
  if (actor.role !== "OWNER") return { members, invitations: [] };
  const now = ctx.now();
  const invited = await ctx.db
    .select({ invitation: invitations, inviter: users.name })
    .from(invitations)
    .leftJoin(users, eq(users.id, invitations.invitedBy))
    .where(and(eq(invitations.organizationId, actor.organizationId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)))
    .orderBy(desc(invitations.createdAt))
    .limit(100);
  return { members, invitations: invited.map((i) => toInvitationDto(i.invitation, i.inviter, now)) };
}

/**
 * Invites an address to the workspace. Re-inviting the same address replaces the open
 * invitation (the old link stops working). An account belongs to one workspace, so addresses that
 * already have an account are refused.
 */
export async function createInvitation(
  ctx: AppContext,
  actor: { id: string; organizationId: string },
  input: CreateInvitationRequest,
): Promise<InvitationCreatedResponse> {
  const now = ctx.now();
  const token = newToken();
  const expiresAt = new Date(now.getTime() + ctx.config.accounts.invitationTtlDays * 86_400_000);
  const out = await ctx.db.transaction(async (tx) => {
    const existing = await findUserByEmail(tx, input.email);
    if (existing) {
      const [member] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, existing.id)));
      if (member) throw conflict("ALREADY_MEMBER", "That person is already a member of this workspace.");
      throw conflict("EMAIL_IN_USE", "That email already has a Quartermaster account in another workspace. Invite a different address.");
    }
    await tx
      .update(invitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(invitations.organizationId, actor.organizationId),
          sql`lower(${invitations.email}) = ${input.email}`,
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      );
    const [row] = await tx
      .insert(invitations)
      .values({
        organizationId: actor.organizationId,
        email: input.email,
        role: input.role,
        tokenHash: hashToken(token),
        invitedBy: actor.id,
        expiresAt,
        createdAt: now,
      })
      .returning();
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "member.invited",
      actorType: "USER",
      actorId: actor.id,
      entityType: "invitation",
      entityId: row!.id,
      data: { email: input.email, role: input.role, expires_at: expiresAt.toISOString() },
    });
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, actor.organizationId));
    const [inviter] = await tx.select({ name: users.name }).from(users).where(eq(users.id, actor.id));
    return { row: row!, orgName: org!.name, inviterName: inviter?.name ?? null };
  });
  const url = linkWithToken(ctx.config.appBaseUrl, "/invite", token);
  const sent = await ctx.mailer.send(
    invitationEmail({ to: input.email, organizationName: out.orgName, inviterName: out.inviterName, role: input.role, url, expiresAt }),
  );
  return { invitation: toInvitationDto(out.row, out.inviterName, now), invite_url: url, email_sent: sent.sent };
}

export async function revokeInvitation(
  ctx: AppContext,
  actor: { id: string; organizationId: string },
  invitationId: string,
): Promise<InvitationDto> {
  const now = ctx.now();
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.organizationId, actor.organizationId)))
      .for("update");
    if (!row) throw notFound("Invitation");
    if (row.acceptedAt) throw conflict("INVITATION_ACCEPTED", "That invitation has already been accepted.");
    const [updated] = row.revokedAt
      ? [row]
      : await tx.update(invitations).set({ revokedAt: now }).where(eq(invitations.id, row.id)).returning();
    if (!row.revokedAt) {
      await appendAudit(tx, {
        organizationId: actor.organizationId,
        action: "member.invitation_revoked",
        actorType: "USER",
        actorId: actor.id,
        entityType: "invitation",
        entityId: row.id,
        data: { email: row.email },
      });
    }
    return toInvitationDto(updated!, null, now);
  });
}

const invalidInvitation = () =>
  new AppError(404, "INVITATION_INVALID", "This invitation link is invalid, has expired, or has already been used. Ask for a new one.");

async function openInvitation(tx: DbOrTx, token: string, now: Date, lock: boolean): Promise<InvitationRow> {
  const q = tx
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, hashToken(token)));
  const [row] = lock ? await q.for("update") : await q;
  if (!row || invitationStatus(row, now) !== "PENDING") throw invalidInvitation();
  return row;
}

export async function previewInvitation(ctx: AppContext, token: string): Promise<InvitationPreviewDto> {
  const row = await openInvitation(ctx.db, token, ctx.now(), false);
  const [org] = await ctx.db.select().from(organizations).where(eq(organizations.id, row.organizationId));
  const [inviter] = row.invitedBy ? await ctx.db.select({ name: users.name }).from(users).where(eq(users.id, row.invitedBy)) : [];
  return {
    organization_name: org!.name,
    email: row.email,
    role: row.role,
    invited_by_name: inviter?.name ?? null,
    expires_at: row.expiresAt.toISOString(),
  };
}

/** Creates the invitee's account, adds them with the invited role and signs them in. */
export async function acceptInvitation(ctx: AppContext, input: AcceptInvitationRequest, meta: SessionMeta) {
  const passwordHash = await hashPassword(input.password);
  const now = ctx.now();
  const out = await ctx.db.transaction(async (tx) => {
    const invitation = await openInvitation(tx, input.token, now, true);
    if (await findUserByEmail(tx, invitation.email)) throw emailInUse();
    const [user] = await tx.insert(users).values({ email: invitation.email, name: input.name, passwordHash, createdAt: now }).returning();
    await tx
      .insert(memberships)
      .values({ organizationId: invitation.organizationId, userId: user!.id, role: invitation.role, createdAt: now });
    await tx.update(invitations).set({ acceptedAt: now, acceptedBy: user!.id }).where(eq(invitations.id, invitation.id));
    await appendAudit(tx, {
      organizationId: invitation.organizationId,
      action: "member.joined",
      actorType: "USER",
      actorId: user!.id,
      entityType: "invitation",
      entityId: invitation.id,
      data: { email: invitation.email, role: invitation.role },
    });
    const session = await openSession(ctx, tx, { userId: user!.id, organizationId: invitation.organizationId, meta });
    return { session, userId: user!.id, organizationId: invitation.organizationId };
  });
  return { ...out.session, user: await sessionUser(ctx, out.userId, out.organizationId) };
}

/** Locks the workspace's memberships and returns them, so owner-count checks cannot race. */
async function lockedMemberships(tx: DbOrTx, organizationId: string) {
  return tx.select().from(memberships).where(eq(memberships.organizationId, organizationId)).orderBy(memberships.createdAt).for("update");
}

const lastOwner = () => conflict("LAST_OWNER", "A workspace needs at least one owner. Make someone else an owner first.");

export async function updateMemberRole(
  ctx: AppContext,
  actor: { id: string; organizationId: string },
  userId: string,
  role: Role,
): Promise<MemberDto> {
  return ctx.db.transaction(async (tx) => {
    const all = await lockedMemberships(tx, actor.organizationId);
    const target = all.find((m) => m.userId === userId);
    if (!target) throw notFound("Member");
    if (target.role === "OWNER" && role !== "OWNER" && all.filter((m) => m.role === "OWNER").length === 1) throw lastOwner();
    if (target.role !== role) {
      await tx.update(memberships).set({ role }).where(eq(memberships.id, target.id));
      await appendAudit(tx, {
        organizationId: actor.organizationId,
        action: "member.role_changed",
        actorType: "USER",
        actorId: actor.id,
        entityType: "user",
        entityId: userId,
        data: { from: target.role, to: role },
      });
    }
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    return {
      user_id: userId,
      email: user!.email,
      name: user!.name,
      role,
      joined_at: target.createdAt.toISOString(),
      is_self: userId === actor.id,
    };
  });
}

/**
 * Removes a member: their sessions end immediately. An account belongs to one workspace, so the
 * account is then disabled and its address released (renamed to a reserved `.invalid` address),
 * which lets the person be invited again or sign up later. The user row is kept because orders,
 * approvals and the audit log refer to it.
 */
export async function removeMember(ctx: AppContext, actor: { id: string; organizationId: string }, userId: string): Promise<void> {
  if (userId === actor.id) throw conflict("CANNOT_REMOVE_SELF", "You cannot remove yourself. Ask another owner to do it.");
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    const all = await lockedMemberships(tx, actor.organizationId);
    const target = all.find((m) => m.userId === userId);
    if (!target) throw notFound("Member");
    if (target.role === "OWNER" && all.filter((m) => m.role === "OWNER").length === 1) throw lastOwner();
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    await tx.delete(memberships).where(eq(memberships.id, target.id));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, userId), eq(sessions.organizationId, actor.organizationId), isNull(sessions.revokedAt)));
    const [remaining] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(memberships)
      .where(eq(memberships.userId, userId));
    if ((remaining?.n ?? 0) === 0) {
      await tx
        .update(users)
        .set({ disabled: true, email: `removed+${userId}@users.invalid` })
        .where(eq(users.id, userId));
    }
    await appendAudit(tx, {
      organizationId: actor.organizationId,
      action: "member.removed",
      actorType: "USER",
      actorId: actor.id,
      entityType: "user",
      entityId: userId,
      data: { email: user?.email ?? null, role: target.role },
    });
  });
}
