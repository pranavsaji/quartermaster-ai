import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Error = {
  /** Stable machine-readable code. */
  code: string;
  /** Human-readable message (fixed per code). */
  message: string;
  details?: Record<string, unknown>;
  /** Request correlation id; quote it to support to find the server logs. */
  correlationId?: string;
};

export const errorSchema: Schema<Error> = s.object<Error>({
  code: s.string(),
  message: s.string(),
  details: s.optional(s.record(s.string(), s.unknown())),
  correlationId: s.optional(s.string()),
  _keysMap: {
    correlationId: "correlation_id",
  },
});
