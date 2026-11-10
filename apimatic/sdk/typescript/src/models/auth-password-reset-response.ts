import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type AuthPasswordResetResponse = {
  /** @default "reset" */
  status?: "reset";
};

export const authPasswordResetResponseSchema: Schema<AuthPasswordResetResponse> =
  s.object<AuthPasswordResetResponse>({
    status: s.defaulted(s.literal("reset"), "reset"),
  });
