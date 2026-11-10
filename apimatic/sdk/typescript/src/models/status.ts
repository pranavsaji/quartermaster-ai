import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Current status. */
export const Status = {
  Ok: "OK",
  Low: "LOW",
  Critical: "CRITICAL",
  Out: "OUT",
} as const;
export type Status = (typeof Status)[keyof typeof Status] | (string & {});

export const statusSchema: EnumSchema<Status> = s.enumOf<Status>(Status);
