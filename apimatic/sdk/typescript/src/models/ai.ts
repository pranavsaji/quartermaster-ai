import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { aiModeSchema, type AiMode } from "./ai-mode.js";

export type Ai = {
  /** Whether the feature is turned on. */
  enabled: boolean;
  /** Whether the language model or the deterministic fallback interpreted a request. */
  mode: AiMode;
};

export const aiSchema: Schema<Ai> = s.object<Ai>({
  enabled: s.boolean(),
  mode: aiModeSchema,
});
