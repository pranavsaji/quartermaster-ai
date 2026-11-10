import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Provider in use. */
export const Provider = {
  Resend: "resend",
  Webhook: "webhook",
  None: "none",
} as const;
export type Provider = (typeof Provider)[keyof typeof Provider] | (string & {});

export const providerSchema: EnumSchema<Provider> = s.enumOf<Provider>(Provider);
