import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Request a password reset email. */
export type ForgotPasswordRequest = {
  /** Email address. */
  email: string;
};

export const forgotPasswordRequestSchema: Schema<ForgotPasswordRequest> = s.object<ForgotPasswordRequest>({
  email: s.string(),
});
