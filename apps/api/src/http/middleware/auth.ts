import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "@qm/contracts";
import { currentScope, type AppContext } from "../../context";
import { AppError, unauthorized } from "../../errors";
import { authenticate, type AuthenticatedUser } from "../../services/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express's Request type is only augmentable through its namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      correlationId?: string;
    }
  }
}

const RANK: Record<Role, number> = { VIEWER: 1, MANAGER: 2, OWNER: 3 };

export function sessionAuth(ctx: AppContext): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[ctx.config.session.cookieName] as string | undefined;
      if (!token || token.length > 200) return next(unauthorized());
      const user = await authenticate(ctx, token);
      if (!user) return next(unauthorized("Your session has expired. Sign in again."));
      req.user = user;
      const scope = currentScope();
      if (scope) {
        scope.userId = user.id;
        scope.organizationId = user.organizationId;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Role gate. OWNER ⊇ MANAGER ⊇ VIEWER. */
export function requireRole(min: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (RANK[req.user.role] < RANK[min]) {
      return next(new AppError(403, "ROLE_REQUIRED", `This action requires the ${min} role.`, { required_role: min, role: req.user.role }));
    }
    next();
  };
}

export function actorOf(req: Request) {
  if (!req.user) throw unauthorized();
  return { id: req.user.id, organizationId: req.user.organizationId, ip: req.ip, userAgent: req.get("user-agent") ?? undefined };
}
