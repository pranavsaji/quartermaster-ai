import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type AuthPasswordForgotResponse = {
  /** @default "sent" */
  status?: "sent";
};

export const authPasswordForgotResponseSchema: Schema<AuthPasswordForgotResponse> =
  s.object<AuthPasswordForgotResponse>({
    status: s.defaulted(s.literal("sent"), "sent"),
  });
