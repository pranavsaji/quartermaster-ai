import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { memberDtoSchema, type MemberDto } from "./member-dto.js";

export type MembersRoleResponse = {
  /** A member of the workspace. */
  member: MemberDto;
};

export const membersRoleResponseSchema: Schema<MembersRoleResponse> = s.object<MembersRoleResponse>({
  member: memberDtoSchema,
});
