import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { role1Schema, type Role1 } from "./role1.js";

/** Invite an email address with a role. */
export type CreateInvitationRequest = {
  /** Email address. */
  email: string;
  /** Workspace role. */
  role: Role1;
};

export const createInvitationRequestSchema: Schema<CreateInvitationRequest> =
  s.object<CreateInvitationRequest>({
    email: s.string(),
    role: role1Schema,
  });
