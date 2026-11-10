import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { kindSchema, type Kind } from "./kind.js";

/** A browser error reported for error tracking. */
export type ClientErrorReport = {
  /** Human-readable message (fixed per code). */
  message: string;
  /** Next.js error digest. */
  digest?: string;
  /** Page path. */
  path: string;
  /** Trimmed stack trace. */
  stack?: string;
  /** Kind of entry. */
  kind: Kind;
};

export const clientErrorReportSchema: Schema<ClientErrorReport> = s.object<ClientErrorReport>({
  message: s.string(),
  digest: s.optional(s.string()),
  path: s.string(),
  stack: s.optional(s.string()),
  kind: kindSchema,
});
