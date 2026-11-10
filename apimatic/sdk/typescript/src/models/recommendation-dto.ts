import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { aiModeSchema, type AiMode } from "./ai-mode.js";

/** The agent's recommended proposal and its explanation. */
export type RecommendationDto = {
  summary: string;
  rationale: string[];
  /** Whether the language model or the deterministic fallback interpreted a request. */
  aiMode: AiMode;
};

export const recommendationDtoSchema: Schema<RecommendationDto> = s.object<RecommendationDto>({
  summary: s.string(),
  rationale: s.array(s.string()),
  aiMode: aiModeSchema,
  _keysMap: {
    aiMode: "ai_mode",
  },
});
