import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/**
 * `POST /members/:id/password-reset` (managers and viewers only). When the link was emailed to the
 * member, `reset_url` is null; otherwise it is the one-time link for the owner to pass on.
 */
export type ResetLinkResponse = {
  /** One-time password reset link, or null when it was emailed to the member. */
  resetUrl: string | null;
  /** When expires happened (ISO 8601, UTC). */
  expiresAt: string;
  /** Whether the link was emailed. */
  emailSent: boolean;
};

export const resetLinkResponseSchema: Schema<ResetLinkResponse> = s.object<ResetLinkResponse>({
  resetUrl: s.nullable(s.string()),
  expiresAt: s.string(),
  emailSent: s.boolean(),
  _keysMap: {
    resetUrl: "reset_url",
    expiresAt: "expires_at",
    emailSent: "email_sent",
  },
});
