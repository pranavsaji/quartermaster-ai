import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@qm/contracts";

export interface PasswordErrors {
  password?: string;
  confirm?: string;
}

/** Field messages for a new password and its confirmation (the API applies the same rules). */
export function checkNewPassword(password: string, confirm: string): PasswordErrors {
  const errors: PasswordErrors = {};
  if (password.trim().length < PASSWORD_MIN_LENGTH) errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (!errors.password && confirm !== password) errors.confirm = "The passwords don't match.";
  return errors;
}

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters. A short phrase is easier to remember than symbols.`;
