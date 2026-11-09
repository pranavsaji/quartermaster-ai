import { Router } from "express";
import { ApproveRequest, CreateProcurementRequest, PaginationQuery, RejectRequest } from "@qm/contracts";
import type { AppContext } from "../../context";
import { getRequestDto, listRequests } from "../../services/procurement/dto";
import { approveProposal, createRequest, evaluateRequest, rejectRequest } from "../../services/procurement/lifecycle";
import { researchRequest } from "../../services/procurement/research";
import { actorOf, requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";
import { idempotent } from "../middleware/idempotency";

export function procurementRoutes(ctx: AppContext): Router {
  const r = Router();

  r.get(
    "/procurement/requests",
    asyncHandler(async (req, res) => {
      const q = parse(PaginationQuery, req.query);
      res.json(await listRequests(ctx.db, req.user!.organizationId, q.limit, q.cursor));
    }),
  );

  r.post(
    "/procurement/requests",
    requireRole("MANAGER"),
    idempotent(ctx, "procurement.create", async (req) => {
      const input = parse(CreateProcurementRequest, req.body);
      return { status: 201, body: await createRequest(ctx, actorOf(req), input) };
    }),
  );

  r.get(
    "/procurement/requests/:id",
    asyncHandler(async (req, res) => {
      res.json(await getRequestDto(ctx.db, req.user!.organizationId, param(req, "id")));
    }),
  );

  r.post(
    "/procurement/requests/:id/research",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      res.json(await researchRequest(ctx, { id: req.user!.id, organizationId: req.user!.organizationId }, param(req, "id")));
    }),
  );

  r.post(
    "/procurement/requests/:id/evaluate",
    requireRole("MANAGER"),
    asyncHandler(async (req, res) => {
      res.json(await evaluateRequest(ctx, actorOf(req), param(req, "id")));
    }),
  );

  r.post(
    "/procurement/requests/:id/approve",
    requireRole("OWNER"),
    idempotent(ctx, "procurement.approve", async (req) => {
      const input = parse(ApproveRequest, req.body);
      return { status: 200, body: await approveProposal(ctx, actorOf(req), param(req, "id"), input) };
    }),
  );

  r.post(
    "/procurement/requests/:id/reject",
    requireRole("OWNER"),
    asyncHandler(async (req, res) => {
      const input = parse(RejectRequest, req.body);
      res.json(await rejectRequest(ctx, actorOf(req), param(req, "id"), input.reason));
    }),
  );

  return r;
}
