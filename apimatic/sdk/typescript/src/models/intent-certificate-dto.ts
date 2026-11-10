import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { certificateStatusSchema, type CertificateStatus } from "./certificate-status.js";
import {
  intentCertificatePayloadSchema,
  type IntentCertificatePayload,
} from "./intent-certificate-payload.js";

/** The owner's signed approval of one exact cart (Ed25519). */
export type IntentCertificateDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Lifecycle of an Intent Certificate. */
  status: CertificateStatus;
  /** The signed fields of an Intent Certificate. */
  payload: IntentCertificatePayload;
  /** Id of the related key. */
  keyId: string;
  signature: string;
  /** @default "Ed25519" */
  algorithm?: "Ed25519";
  /** When issued happened (ISO 8601, UTC). */
  issuedAt: string;
  /** When expires happened (ISO 8601, UTC). */
  expiresAt: string;
};

export const intentCertificateDtoSchema: Schema<IntentCertificateDto> = s.object<IntentCertificateDto>({
  id: s.string(),
  status: certificateStatusSchema,
  payload: intentCertificatePayloadSchema,
  keyId: s.string(),
  signature: s.string(),
  algorithm: s.defaulted(s.literal("Ed25519"), "Ed25519"),
  issuedAt: s.string(),
  expiresAt: s.string(),
  _keysMap: {
    keyId: "key_id",
    issuedAt: "issued_at",
    expiresAt: "expires_at",
  },
});
