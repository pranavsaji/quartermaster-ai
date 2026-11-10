import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { severity2Schema, type Severity2 } from "./severity2.js";
import { violationCodeSchema, type ViolationCode } from "./violation-code.js";

/** A policy violation with its severity and explanation. */
export type ViolationDto = {
  /** Machine-readable TrustRail policy violation. */
  code: ViolationCode;
  /** Severity. */
  severity: Severity2;
  /** Human-readable message (fixed per code). */
  message: string;
  evidence?: Record<string, unknown>;
};

export const violationDtoSchema: Schema<ViolationDto> = s.object<ViolationDto>({
  code: violationCodeSchema,
  severity: severity2Schema,
  message: s.string(),
  evidence: s.optional(s.record(s.string(), s.unknown())),
});
