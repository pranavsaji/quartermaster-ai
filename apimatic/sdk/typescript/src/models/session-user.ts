import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { organizationSchema, type Organization } from "./organization.js";
import { roleSchema, type Role } from "./role.js";

/** The signed-in user and their workspace. */
export type SessionUser = {
  /** Unique identifier (UUID). */
  id: string;
  /** Email address. */
  email: string;
  /** Display name. */
  name: string;
  /** Workspace role: owners approve and pay, managers request, viewers read. */
  role: Role;
  /** The user's workspace. */
  organization: Organization;
  /** Platform operator (OPERATOR_EMAILS): may see system-wide error tracking. */
  operator: boolean;
};

export const sessionUserSchema: Schema<SessionUser> = s.object<SessionUser>({
  id: s.string(),
  email: s.string(),
  name: s.string(),
  role: roleSchema,
  organization: organizationSchema,
  operator: s.boolean(),
});
