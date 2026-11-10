import { Router, type RequestHandler } from "express";
import { and, desc, isNotNull, isNull, lt, or, sql, eq } from "drizzle-orm";
import { ErrorsQuery } from "@qm/contracts";
import { systemErrors } from "@qm/database";
import type { AppContext } from "../../context";
import { AppError, notFound } from "../../errors";
import { isOperator } from "../../services/auth";
import { opsHealth, paypalNotificationStatus } from "../../services/monitoring/status";
import { toSystemErrorDto } from "../../services/monitoring/tracker";
import { decodeCursor, encodeCursor } from "../../services/pagination";
import { asyncHandler, param, parse } from "../middleware/errors";

/** System-wide error tracking is for platform operators (OPERATOR_EMAILS), not workspace owners. */
export function requireOperator(ctx: AppContext): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !isOperator(ctx, req.user.email)) {
      return next(new AppError(403, "OPERATOR_REQUIRED", "This page is for platform operators."));
    }
    next();
  };
}

export function monitoringRoutes(ctx: AppContext): Router {
  const r = Router();

  r.get(
    "/security/paypal-notifications",
    asyncHandler(async (req, res) => {
      res.json({ status: await paypalNotificationStatus(ctx, req.user!.organizationId) });
    }),
  );

  const ops = Router();
  ops.use(requireOperator(ctx));

  ops.get(
    "/health",
    asyncHandler(async (_req, res) => {
      res.json(await opsHealth(ctx));
    }),
  );

  // Most recently seen first; the cursor is (last_seen_at, id).
  ops.get(
    "/errors",
    asyncHandler(async (req, res) => {
      const q = parse(ErrorsQuery, req.query);
      const cursor = decodeCursor(q.cursor);
      const rows = await ctx.db
        .select()
        .from(systemErrors)
        .where(
          and(
            q.status === "OPEN"
              ? isNull(systemErrors.resolvedAt)
              : q.status === "RESOLVED"
                ? isNotNull(systemErrors.resolvedAt)
                : undefined,
            cursor
              ? or(
                  lt(systemErrors.lastSeenAt, cursor.at),
                  and(eq(systemErrors.lastSeenAt, cursor.at), sql`${systemErrors.id} < ${cursor.id}::uuid`),
                )
              : undefined,
          ),
        )
        .orderBy(desc(systemErrors.lastSeenAt), desc(systemErrors.id))
        .limit(q.limit + 1);
      const page = rows.slice(0, q.limit);
      const last = page[page.length - 1];
      res.json({
        items: page.map(toSystemErrorDto),
        next_cursor: rows.length > q.limit && last ? encodeCursor(last.lastSeenAt, last.id) : null,
      });
    }),
  );

  ops.post(
    "/errors/:id/resolve",
    asyncHandler(async (req, res) => {
      const row = await ctx.errors.resolve(param(req, "id"));
      if (!row) throw notFound("Error");
      res.json({ error: toSystemErrorDto(row) });
    }),
  );

  ops.post(
    "/alerts/test",
    asyncHandler(async (req, res) => {
      const delivery = await ctx.errors.sendAlert({
        level: "warning",
        title: "Test alert from Quartermaster",
        lines: [`Sent by ${req.user!.email} to check that alerts arrive.`],
      });
      res.json(delivery);
    }),
  );

  // Mounted under /ops so the operator check never runs for other paths.
  r.use("/ops", ops);
  return r;
}
