import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { sessionUserSchema, type SessionUser } from "./session-user.js";

export type AuthSignupResponse = {
  /** The signed-in user and their workspace. */
  user: SessionUser;
};

export const authSignupResponseSchema: Schema<AuthSignupResponse> = s.object<AuthSignupResponse>({
  user: sessionUserSchema,
});
