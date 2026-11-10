import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invitationStatusSchema, type InvitationStatus } from "./invitation-status.js";
import { roleSchema, type Role } from "./role.js";

/** An invitation to the workspace. */
export type InvitationDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Email address. */
  email: string;
  /** Workspace role: owners approve and pay, managers request, viewers read. */
  role: Role;
  /** Invitation lifecycle. */
  status: InvitationStatus;
  /** Name of the owner who sent the invitation. */
  invitedByName: string | null;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
  /** When expires happened (ISO 8601, UTC). */
  expiresAt: string;
};

export const invitationDtoSchema: Schema<InvitationDto> = s.object<InvitationDto>({
  id: s.string(),
  email: s.string(),
  role: roleSchema,
  status: invitationStatusSchema,
  invitedByName: s.nullable(s.string()),
  createdAt: s.string(),
  expiresAt: s.string(),
  _keysMap: {
    invitedByName: "invited_by_name",
    createdAt: "created_at",
    expiresAt: "expires_at",
  },
});
