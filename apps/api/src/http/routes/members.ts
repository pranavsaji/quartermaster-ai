import { Router } from "express";
import { CreateInvitationRequest, UpdateMemberRoleRequest } from "@qm/contracts";
import type { AppContext } from "../../context";
import { issueMemberResetLink } from "../../services/accounts/accounts";
import { createInvitation, listMembers, removeMember, revokeInvitation, updateMemberRole } from "../../services/accounts/members";
import { requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";

/** Workspace members and invitations. Everyone can see the team; only owners change it. */
export function memberRoutes(ctx: AppContext): Router {
  const r = Router();
  const actor = (req: { user?: { id: string; organizationId: string } }) => ({
    id: req.user!.id,
    organizationId: req.user!.organizationId,
  });

  r.get(
    "/members",
    asyncHandler(async (req, res) => {
      res.json(await listMembers(ctx, { id: req.user!.id, organizationId: req.user!.organizationId, role: req.user!.role }));
    }),
  );

  r.post(
    "/members/invitations",
    requireRole("OWNER"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await createInvitation(ctx, actor(req), parse(CreateInvitationRequest, req.body)));
    }),
  );

  r.post(
    "/members/invitations/:id/revoke",
    requireRole("OWNER"),
    asyncHandler(async (req, res) => {
      res.json({ invitation: await revokeInvitation(ctx, actor(req), param(req, "id")) });
    }),
  );

  r.put(
    "/members/:id/role",
    requireRole("OWNER"),
    asyncHandler(async (req, res) => {
      const { role } = parse(UpdateMemberRoleRequest, req.body);
      res.json({ member: await updateMemberRole(ctx, actor(req), param(req, "id"), role) });
    }),
  );

  r.post(
    "/members/:id/remove",
    requireRole("OWNER"),
    asyncHandler(async (req, res) => {
      await removeMember(ctx, actor(req), param(req, "id"));
      res.status(204).end();
    }),
  );

  r.post(
    "/members/:id/password-reset",
    requireRole("OWNER"),
    asyncHandler(async (req, res) => {
      res.json(await issueMemberResetLink(ctx, actor(req), param(req, "id")));
    }),
  );

  return r;
}
