import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { errorSchema, type Error } from "./error.js";

/** Error envelope shared by every endpoint. `code` is stable; `message` is fixed per code. */
export type ApiErrorError = {
  error: Error;
};

export const apiErrorErrorSchema: Schema<ApiErrorError> = s.object<ApiErrorError>({
  error: errorSchema,
});
