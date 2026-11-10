import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Lifecycle of an Intent Certificate. */
export const CertificateStatus = {
  Active: "ACTIVE",
  Consumed: "CONSUMED",
  Revoked: "REVOKED",
  Expired: "EXPIRED",
} as const;
export type CertificateStatus = (typeof CertificateStatus)[keyof typeof CertificateStatus] | (string & {});

export const certificateStatusSchema: EnumSchema<CertificateStatus> =
  s.enumOf<CertificateStatus>(CertificateStatus);
