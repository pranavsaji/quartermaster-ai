import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** An invitation link token. */
export type InvitationTokenRequest = {
  /** One-time link token from an invitation or reset email. */
  token: string;
};

export const invitationTokenRequestSchema: Schema<InvitationTokenRequest> = s.object<InvitationTokenRequest>({
  token: s.string(),
});
