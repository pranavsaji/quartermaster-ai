import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Where the error came from. */
export const Source = {
  Api: "api",
  Web: "web",
  Job: "job",
  Monitor: "monitor",
} as const;
export type Source = (typeof Source)[keyof typeof Source] | (string & {});

export const sourceSchema: EnumSchema<Source> = s.enumOf<Source>(Source);
