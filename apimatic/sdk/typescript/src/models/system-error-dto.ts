import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { levelSchema, type Level } from "./level.js";
import { sourceSchema, type Source } from "./source.js";

/** A tracked error group (operators only). */
export type SystemErrorDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Grouping key for identical errors. */
  fingerprint: string;
  /** Where the error came from. */
  source: Source;
  /** Severity level. */
  level: Level;
  /** Stable machine-readable code. */
  code: string;
  /** Human-readable message (fixed per code). */
  message: string;
  /** API route template or page path. */
  route: string | null;
  /** How many times this error occurred. */
  occurrences: number;
  /** When first seen happened (ISO 8601, UTC). */
  firstSeenAt: string;
  /** When last seen happened (ISO 8601, UTC). */
  lastSeenAt: string;
  /** Id of the related last correlation. */
  lastCorrelationId: string | null;
  /** When last alerted happened (ISO 8601, UTC). */
  lastAlertedAt: string | null;
  /** When resolved happened (ISO 8601, UTC). */
  resolvedAt: string | null;
};

export const systemErrorDtoSchema: Schema<SystemErrorDto> = s.object<SystemErrorDto>({
  id: s.string(),
  fingerprint: s.string(),
  source: sourceSchema,
  level: levelSchema,
  code: s.string(),
  message: s.string(),
  route: s.nullable(s.string()),
  occurrences: s.int(),
  firstSeenAt: s.string(),
  lastSeenAt: s.string(),
  lastCorrelationId: s.nullable(s.string()),
  lastAlertedAt: s.nullable(s.string()),
  resolvedAt: s.nullable(s.string()),
  _keysMap: {
    firstSeenAt: "first_seen_at",
    lastSeenAt: "last_seen_at",
    lastCorrelationId: "last_correlation_id",
    lastAlertedAt: "last_alerted_at",
    resolvedAt: "resolved_at",
  },
});
