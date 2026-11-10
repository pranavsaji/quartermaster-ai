import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** CSRF guard: must be `quartermaster` on every mutation. */
export const XRequestedWith = {
  Quartermaster: "quartermaster",
} as const;
export type XRequestedWith = (typeof XRequestedWith)[keyof typeof XRequestedWith] | (string & {});

export const xRequestedWithSchema: EnumSchema<XRequestedWith> = s.enumOf<XRequestedWith>(XRequestedWith);
