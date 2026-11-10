import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Create a workspace and its first owner. */
export type SignupRequest = {
  /** Display name. */
  name: string;
  /** Email address. */
  email: string;
  /** Password (never returned by the API). */
  password: string;
  /** Workspace (restaurant) name. */
  organizationName: string;
  /** IANA time zone of the workspace. @default "America/Los_Angeles" */
  timezone?: string;
  /** Start the workspace with labelled sample suppliers, stock and history. @default true */
  sampleData?: boolean;
};

export const signupRequestSchema: Schema<SignupRequest> = s.object<SignupRequest>({
  name: s.string(),
  email: s.string(),
  password: s.string(),
  organizationName: s.string(),
  timezone: s.defaulted(s.string(), "America/Los_Angeles"),
  sampleData: s.defaulted(s.boolean(), true),
  _keysMap: {
    organizationName: "organization_name",
    sampleData: "sample_data",
  },
});
