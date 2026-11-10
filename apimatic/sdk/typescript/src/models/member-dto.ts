import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { roleSchema, type Role } from "./role.js";

/** A member of the workspace. */
export type MemberDto = {
  /** Id of the related user. */
  userId: string;
  /** Email address. */
  email: string;
  /** Display name. */
  name: string;
  /** Workspace role: owners approve and pay, managers request, viewers read. */
  role: Role;
  /** When joined happened (ISO 8601, UTC). */
  joinedAt: string;
  /** True for the signed-in user. */
  isSelf: boolean;
};

export const memberDtoSchema: Schema<MemberDto> = s.object<MemberDto>({
  userId: s.string(),
  email: s.string(),
  name: s.string(),
  role: roleSchema,
  joinedAt: s.string(),
  isSelf: s.boolean(),
  _keysMap: {
    userId: "user_id",
    joinedAt: "joined_at",
    isSelf: "is_self",
  },
});
