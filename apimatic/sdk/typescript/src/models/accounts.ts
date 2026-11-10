import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Accounts = {
  /** Anyone may create a workspace. */
  signupEnabled: boolean;
  /** Outbound email is configured: invitations and reset links are emailed. */
  emailEnabled: boolean;
};

export const accountsSchema: Schema<Accounts> = s.object<Accounts>({
  signupEnabled: s.boolean(),
  emailEnabled: s.boolean(),
  _keysMap: {
    signupEnabled: "signup_enabled",
    emailEnabled: "email_enabled",
  },
});
