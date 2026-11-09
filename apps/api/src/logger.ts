import pino, { type DestinationStream } from "pino";
import { currentScope } from "./context";

/**
 * Request correlation for every log line written inside a request (see `correlation` middleware),
 * including service-level `ctx.log` calls that never see `req`.
 */
function requestFields(): Record<string, string> {
  const scope = currentScope();
  if (!scope) return {};
  return {
    correlation_id: scope.correlationId,
    ...(scope.organizationId ? { organization_id: scope.organizationId } : {}),
    ...(scope.userId ? { user_id: scope.userId } : {}),
  };
}

/**
 * Structured JSON logger. Redaction is defensive: request bodies are never logged, and any field
 * that could carry a credential is censored if it slips into a log call.
 */
export function createLogger(level: string, destination?: DestinationStream) {
  return pino(
    {
      level,
      base: { service: "quartermaster-api" },
      timestamp: pino.stdTimeFunctions.isoTime,
      mixin: requestFields,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
          "*.password",
          "*.passwordHash",
          "*.token",
          "*.access_token",
          "*.client_secret",
          "*.apiKey",
          "*.privateKey",
        ],
        censor: "[redacted]",
      },
    },
    destination,
  );
}

export type Logger = ReturnType<typeof createLogger>;
