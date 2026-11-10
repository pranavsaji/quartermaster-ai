import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Severity level. */
export const Level = {
  Warning: "warning",
  Error: "error",
  Fatal: "fatal",
} as const;
export type Level = (typeof Level)[keyof typeof Level] | (string & {});

export const levelSchema: EnumSchema<Level> = s.enumOf<Level>(Level);
