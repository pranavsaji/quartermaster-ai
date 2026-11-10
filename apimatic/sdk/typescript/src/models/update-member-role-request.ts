import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { role1Schema, type Role1 } from "./role1.js";

/** A member's new role. */
export type UpdateMemberRoleRequest = {
  /** Workspace role. */
  role: Role1;
};

export const updateMemberRoleRequestSchema: Schema<UpdateMemberRoleRequest> =
  s.object<UpdateMemberRoleRequest>({
    role: role1Schema,
  });
