import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** How the notification was handled. */
export const Outcome = {
  Processed: "PROCESSED",
  Ignored: "IGNORED",
  Duplicate: "DUPLICATE",
} as const;
export type Outcome = (typeof Outcome)[keyof typeof Outcome] | (string & {});

export const outcomeSchema: EnumSchema<Outcome> = s.enumOf<Outcome>(Outcome);
