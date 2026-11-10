import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { roleSchema, type Role } from "./role.js";

/** What someone opening an invitation link sees before accepting. */
export type InvitationPreviewDto = {
  /** Workspace (restaurant) name. */
  organizationName: string;
  /** Email address. */
  email: string;
  /** Workspace role: owners approve and pay, managers request, viewers read. */
  role: Role;
  /** Name of the owner who sent the invitation. */
  invitedByName: string | null;
  /** When expires happened (ISO 8601, UTC). */
  expiresAt: string;
};

export const invitationPreviewDtoSchema: Schema<InvitationPreviewDto> = s.object<InvitationPreviewDto>({
  organizationName: s.string(),
  email: s.string(),
  role: roleSchema,
  invitedByName: s.nullable(s.string()),
  expiresAt: s.string(),
  _keysMap: {
    organizationName: "organization_name",
    invitedByName: "invited_by_name",
    expiresAt: "expires_at",
  },
});
