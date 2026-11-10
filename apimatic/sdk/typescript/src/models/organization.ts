import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** The user's workspace. */
export type Organization = {
  /** Unique identifier (UUID). */
  id: string;
  /** Display name. */
  name: string;
  /** IANA time zone of the workspace. */
  timezone: string;
  /** ISO 4217 currency code. */
  currency: string;
};

export const organizationSchema: Schema<Organization> = s.object<Organization>({
  id: s.string(),
  name: s.string(),
  timezone: s.string(),
  currency: s.string(),
});
