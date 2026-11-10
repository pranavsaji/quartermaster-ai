import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invitationPreviewDtoSchema, type InvitationPreviewDto } from "./invitation-preview-dto.js";

export type InvitationsLookupResponse = {
  /** What someone opening an invitation link sees before accepting. */
  invitation: InvitationPreviewDto;
};

export const invitationsLookupResponseSchema: Schema<InvitationsLookupResponse> =
  s.object<InvitationsLookupResponse>({
    invitation: invitationPreviewDtoSchema,
  });
