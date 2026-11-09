import pino from "pino";

/**
 * Structured JSON logger. Redaction is defensive: request bodies are never logged, and any field
 * that could carry a credential is censored if it slips into a log call.
 */
export function createLogger(level: string) {
  return pino({
    level,
    base: { service: "quartermaster-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers[\"set-cookie\"]",
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
  });
}

export type Logger = ReturnType<typeof createLogger>;
