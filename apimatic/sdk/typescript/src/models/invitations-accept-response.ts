import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { sessionUserSchema, type SessionUser } from "./session-user.js";

export type InvitationsAcceptResponse = {
  /** The signed-in user and their workspace. */
  user: SessionUser;
};

export const invitationsAcceptResponseSchema: Schema<InvitationsAcceptResponse> =
  s.object<InvitationsAcceptResponse>({
    user: sessionUserSchema,
  });
