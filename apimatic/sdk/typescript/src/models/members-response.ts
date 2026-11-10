import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invitationDtoSchema, type InvitationDto } from "./invitation-dto.js";
import { memberDtoSchema, type MemberDto } from "./member-dto.js";

/** `GET /members`. Invitations are listed for owners only (empty otherwise). */
export type MembersResponse = {
  members: MemberDto[];
  invitations: InvitationDto[];
};

export const membersResponseSchema: Schema<MembersResponse> = s.object<MembersResponse>({
  members: s.array(s.lazy(() => memberDtoSchema)),
  invitations: s.array(s.lazy(() => invitationDtoSchema)),
});
