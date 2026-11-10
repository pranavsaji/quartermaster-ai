import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Deployment environment. */
export const Environment = {
  Sandbox: "sandbox",
  Live: "live",
} as const;
export type Environment = (typeof Environment)[keyof typeof Environment] | (string & {});

export const environmentSchema: EnumSchema<Environment> = s.enumOf<Environment>(Environment);
