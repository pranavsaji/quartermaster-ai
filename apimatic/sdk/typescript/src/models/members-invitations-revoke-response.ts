import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invitationDtoSchema, type InvitationDto } from "./invitation-dto.js";

export type MembersInvitationsRevokeResponse = {
  /** An invitation to the workspace. */
  invitation: InvitationDto;
};

export const membersInvitationsRevokeResponseSchema: Schema<MembersInvitationsRevokeResponse> =
  s.object<MembersInvitationsRevokeResponse>({
    invitation: invitationDtoSchema,
  });
