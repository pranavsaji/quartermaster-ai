import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invitationDtoSchema, type InvitationDto } from "./invitation-dto.js";

/**
 * `POST /members/invitations`. The link is returned to the owner so it can be shared even when no
 * email provider is configured; it is never retrievable again.
 */
export type InvitationCreatedResponse = {
  /** An invitation to the workspace. */
  invitation: InvitationDto;
  /** One-time invitation link (token in the URL fragment). Shown once. */
  inviteUrl: string;
  /** Whether the link was emailed. */
  emailSent: boolean;
};

export const invitationCreatedResponseSchema: Schema<InvitationCreatedResponse> =
  s.object<InvitationCreatedResponse>({
    invitation: invitationDtoSchema,
    inviteUrl: s.string(),
    emailSent: s.boolean(),
    _keysMap: {
      inviteUrl: "invite_url",
      emailSent: "email_sent",
    },
  });
