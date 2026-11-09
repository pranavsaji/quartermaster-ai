import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { idempotencyKeys } from "@qm/database";
import type { AppContext } from "../../context";
import { AppError, conflict, unprocessable } from "../../errors";

const KEY = /^[\w-]{8,128}$/;
const STALE_MS = 2 * 60_000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value as object)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

/**
 * Application-level idempotency for payment and approval mutations. The same key with the same
 * request replays the stored response; the same key with a different request is rejected.
 * Only successful responses are stored, so a failed attempt can be retried with the same key.
 */
export function idempotent(ctx: AppContext, route: string, handler: (req: Request) => Promise<HandlerResult>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.get("idempotency-key");
      if (!key || !KEY.test(key)) throw new AppError(400, "IDEMPOTENCY_KEY_REQUIRED", "An Idempotency-Key header (8–128 characters) is required.");
      const user = req.user!;
      const requestHash = createHash("sha256").update(`${req.method} ${route} ${stableStringify(req.params)} ${stableStringify(req.body ?? null)}`).digest("hex");
      const scope = and(eq(idempotencyKeys.organizationId, user.organizationId), eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key));

      // `lease` (the row's created_at) identifies which execution owns an IN_PROGRESS key, so a
      // stale takeover, completion and cleanup all act only on the execution that owns it.
      const startedAt = ctx.now();
      const inserted = await ctx.db
        .insert(idempotencyKeys)
        .values({ organizationId: user.organizationId, userId: user.id, key, route, requestHash, status: "IN_PROGRESS", createdAt: startedAt })
        .onConflictDoNothing()
        .returning({ id: idempotencyKeys.id, createdAt: idempotencyKeys.createdAt });
      let lease = inserted[0]?.createdAt ?? startedAt;

      if (inserted.length === 0) {
        const [existing] = await ctx.db.select().from(idempotencyKeys).where(scope);
        if (!existing) throw conflict("IDEMPOTENCY_RACE", "Retry the request.");
        if (existing.requestHash !== requestHash || existing.route !== route) {
          throw unprocessable("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used for a different request.");
        }
        if (existing.status === "COMPLETED") {
          res.setHeader("idempotent-replayed", "true");
          return res.status(existing.responseStatus ?? 200).json(existing.responseBody);
        }
        if (ctx.now().getTime() - existing.createdAt.getTime() < STALE_MS) {
          throw conflict("IDEMPOTENCY_IN_PROGRESS", "A request with this Idempotency-Key is still in progress.");
        }
        // A stale in-progress record (process crashed mid-request): take it over atomically, so
        // only one of several concurrent retries wins.
        const taken = await ctx.db
          .update(idempotencyKeys)
          .set({ createdAt: startedAt })
          .where(and(scope, eq(idempotencyKeys.status, "IN_PROGRESS"), eq(idempotencyKeys.createdAt, existing.createdAt)))
          .returning({ createdAt: idempotencyKeys.createdAt });
        if (taken.length === 0) throw conflict("IDEMPOTENCY_IN_PROGRESS", "A request with this Idempotency-Key is still in progress.");
        lease = taken[0]!.createdAt;
      }
      const owned = and(scope, eq(idempotencyKeys.status, "IN_PROGRESS"), eq(idempotencyKeys.createdAt, lease));

      let result: HandlerResult;
      try {
        result = await handler(req);
      } catch (err) {
        await ctx.db.delete(idempotencyKeys).where(owned);
        throw err;
      }
      await ctx.db
        .update(idempotencyKeys)
        .set({ status: "COMPLETED", responseStatus: result.status, responseBody: result.body as never })
        .where(owned);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  };
}
