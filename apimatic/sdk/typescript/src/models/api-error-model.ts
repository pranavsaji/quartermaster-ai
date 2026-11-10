import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { errorSchema, type Error } from "./error.js";

/** Error envelope shared by every endpoint. `code` is stable; `message` is fixed per code. */
export type ApiErrorModel = {
  error: Error;
};

export const apiErrorModelSchema: Schema<ApiErrorModel> = s.object<ApiErrorModel>({
  error: errorSchema,
});
