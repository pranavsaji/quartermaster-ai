import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Accept an invitation: the invitee's name and new password, with the link token. */
export type AcceptInvitationRequest = {
  /** One-time link token from an invitation or reset email. */
  token: string;
  /** Display name. */
  name: string;
  /** Password (never returned by the API). */
  password: string;
};

export const acceptInvitationRequestSchema: Schema<AcceptInvitationRequest> =
  s.object<AcceptInvitationRequest>({
    token: s.string(),
    name: s.string(),
    password: s.string(),
  });
