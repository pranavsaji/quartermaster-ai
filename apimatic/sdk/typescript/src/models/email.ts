import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { providerSchema, type Provider } from "./provider.js";

/** Email address. */
export type Email = {
  /** Whether the feature is turned on. */
  enabled: boolean;
  /** Provider in use. */
  provider: Provider;
};

export const emailSchema: Schema<Email> = s.object<Email>({
  enabled: s.boolean(),
  provider: providerSchema,
});
