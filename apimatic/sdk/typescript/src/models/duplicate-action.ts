import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** What happens to a likely duplicate order: REVIEW or BLOCK. */
export const DuplicateAction = {
  Review: "REVIEW",
  Block: "BLOCK",
} as const;
export type DuplicateAction = (typeof DuplicateAction)[keyof typeof DuplicateAction] | (string & {});

export const duplicateActionSchema: EnumSchema<DuplicateAction> = s.enumOf<DuplicateAction>(DuplicateAction);
