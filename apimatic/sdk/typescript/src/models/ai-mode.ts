import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Whether the language model or the deterministic fallback interpreted a request. */
export const AiMode = {
  Llm: "LLM",
  DeterministicFallback: "DETERMINISTIC_FALLBACK",
} as const;
export type AiMode = (typeof AiMode)[keyof typeof AiMode] | (string & {});

export const aiModeSchema: EnumSchema<AiMode> = s.enumOf<AiMode>(AiMode);
