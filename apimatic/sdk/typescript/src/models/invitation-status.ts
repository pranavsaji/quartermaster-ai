import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Invitation lifecycle. */
export const InvitationStatus = {
  Pending: "PENDING",
  Accepted: "ACCEPTED",
  Revoked: "REVOKED",
  Expired: "EXPIRED",
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus] | (string & {});

export const invitationStatusSchema: EnumSchema<InvitationStatus> =
  s.enumOf<InvitationStatus>(InvitationStatus);
