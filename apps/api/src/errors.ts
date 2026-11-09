/**
 * Application errors carry a stable machine-readable code and an HTTP status. `message` is sent
 * to the client, so it must be authored text, never an upstream or driver `err.message`. For
 * 4xx, `details` is sent verbatim; for 5xx only its scalar non-string fields are (see
 * publicServerErrorDetails), the rest is logged.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message = "Authentication required") => new AppError(401, "UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have permission to perform this action") => new AppError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`);
export const conflict = (code: string, message: string, details?: unknown) => new AppError(409, code, message, details);
export const unprocessable = (code: string, message: string, details?: unknown) => new AppError(422, code, message, details);
export const unavailable = (code: string, message: string) => new AppError(503, code, message);
export const badGateway = (code: string, message: string, details?: unknown) => new AppError(502, code, message, details);
