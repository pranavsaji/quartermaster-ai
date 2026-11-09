import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";
import type { Logger } from "../../logger";
import { AppError, badRequest } from "../../errors";

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw badRequest(
      "Request validation failed",
      r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return r.data;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validates a UUID route parameter, turning malformed ids into 404s rather than database errors. */
export function param(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== "string" || !UUID.test(v)) throw new AppError(404, "NOT_FOUND", "Resource not found");
  return v.toLowerCase();
}

/** Wraps an async handler so rejections reach the error middleware. */
export function asyncHandler(fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/**
 * Details of a 5xx are reduced to top-level boolean, number and null fields (e.g. `retryable`).
 * Strings and nested objects are dropped: they can carry upstream or driver error text that must
 * not reach clients. The full details are logged instead.
 */
export function publicServerErrorDetails(details: unknown): Record<string, boolean | number | null> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const safe = Object.entries(details as Record<string, unknown>).filter(([, v]) => v === null || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)));
  return safe.length ? (Object.fromEntries(safe) as Record<string, boolean | number | null>) : undefined;
}

export function errorHandler(log: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const correlation_id = req.correlationId;
    if (err instanceof AppError) {
      if (err.status >= 500) {
        log.error({ err, details: err.details, correlation_id }, err.message);
        return res.status(err.status).json({ error: { code: err.code, message: err.message, details: publicServerErrorDetails(err.details), correlation_id } });
      }
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details, correlation_id } });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Request validation failed", details: err.issues, correlation_id } });
    }
    if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
      return res.status(400).json({ error: { code: "MALFORMED_JSON", message: "Request body is not valid JSON", correlation_id } });
    }
    if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.too.large") {
      return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large", correlation_id } });
    }
    // Unique-constraint races surface as conflicts, not 500s.
    // Drizzle wraps driver errors, so the SQLSTATE may be on `cause`.
    const sqlState = (err as { code?: string; cause?: { code?: string } } | null)?.code ?? (err as { cause?: { code?: string } } | null)?.cause?.code;
    if (sqlState === "23505") {
      return res.status(409).json({ error: { code: "CONFLICT", message: "The resource was modified concurrently. Retry the request.", correlation_id } });
    }
    log.error({ err, correlation_id, path: req.path }, "unhandled error");
    res.status(500).json({ error: { code: "INTERNAL", message: "An unexpected error occurred.", correlation_id } });
  };
}
