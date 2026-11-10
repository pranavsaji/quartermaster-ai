import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ClientErrorsResponse = {
  /** @default "recorded" */
  status?: "recorded";
};

export const clientErrorsResponseSchema: Schema<ClientErrorsResponse> = s.object<ClientErrorsResponse>({
  status: s.defaulted(s.literal("recorded"), "recorded"),
});
