import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Change the signed-in user's password. */
export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export const changePasswordRequestSchema: Schema<ChangePasswordRequest> = s.object<ChangePasswordRequest>({
  currentPassword: s.string(),
  newPassword: s.string(),
  _keysMap: {
    currentPassword: "current_password",
    newPassword: "new_password",
  },
});
