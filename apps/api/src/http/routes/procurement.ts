import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { ApproveRequest, CreateProcurementRequest, PaginationQuery, RejectRequest } from "@qm/contracts";
import type { AppContext } from "../../context";
import { getRequestDto, listRequests } from "../../services/procurement/dto";
import { approveProposal, createRequest, evaluateRequest, rejectRequest } from "../../services/procurement/lifecycle";
import { researchRequest } from "../../services/procurement/research";
import { actorOf, requireRole } from "../middleware/auth";
import { asyncHandler, param, parse } from "../middleware/errors";
import { idempotent } from "../middleware/idempotency";
import { limiterStore } from "../rate-limit-store";

/** Rate-limit key for research runs: the user, plus the client address in the shared sample workspace. */
export function researchLimitKey(user: { id: string; sampleWorkspace: boolean } | undefined, address: string): string {
  if (!user) return address;
  return user.sampleWorkspace ? `${user.id}|${address}` : user.id;
}

export function procurementRoutes(ctx: AppContext): Router {
  const r = Router();

  // Research runs paid model and market-data calls; cap it per user to bound cost and abuse.
  // Everyone trying the shared sample workspace signs in as the same user, so there the cap is
  // per user and client address: one visitor cannot use up another's runs.
  const researchLimiter = rateLimit({
    windowMs: 10 * 60_000,
    ...limiterStore(ctx, "research"),
    limit: ctx.config.env === "test" ? 1000 : 20,
    keyGenerator: (req) => researchLimitKey(req.user, ipKeyGenerator(req.ip ?? "0.0.0.0")),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many research runs. Try again in a few minutes." } },
  });

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
    researchLimiter,
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
      res.json(await rejectRequest(ctx, actorOf(req), param(req, "id"), input.reason, input.purchase_order_id));
    }),
  );

  return r;
}
