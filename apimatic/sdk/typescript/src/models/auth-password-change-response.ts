import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type AuthPasswordChangeResponse = {
  /** @default "changed" */
  status?: "changed";
};

export const authPasswordChangeResponseSchema: Schema<AuthPasswordChangeResponse> =
  s.object<AuthPasswordChangeResponse>({
    status: s.defaulted(s.literal("changed"), "changed"),
  });
