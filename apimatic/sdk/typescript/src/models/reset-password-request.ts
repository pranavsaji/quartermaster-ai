import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Set a new password from a one-time reset link. */
export type ResetPasswordRequest = {
  /** One-time link token from an invitation or reset email. */
  token: string;
  /** Password (never returned by the API). */
  password: string;
};

export const resetPasswordRequestSchema: Schema<ResetPasswordRequest> = s.object<ResetPasswordRequest>({
  token: s.string(),
  password: s.string(),
});
