import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { systemErrorDtoSchema, type SystemErrorDto } from "./system-error-dto.js";

export type OpsErrorsResolveResponse = {
  /** A tracked error group (operators only). */
  error: SystemErrorDto;
};

export const opsErrorsResolveResponseSchema: Schema<OpsErrorsResolveResponse> =
  s.object<OpsErrorsResolveResponse>({
    error: systemErrorDtoSchema,
  });
