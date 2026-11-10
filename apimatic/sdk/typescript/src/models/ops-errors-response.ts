import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { systemErrorDtoSchema, type SystemErrorDto } from "./system-error-dto.js";

export type OpsErrorsResponse = {
  items: SystemErrorDto[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
};

export const opsErrorsResponseSchema: Schema<OpsErrorsResponse> = s.object<OpsErrorsResponse>({
  items: s.array(s.lazy(() => systemErrorDtoSchema)),
  nextCursor: s.nullable(s.string()),
  _keysMap: {
    nextCursor: "next_cursor",
  },
});
