import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Email and password sign-in. */
export type LoginRequest = {
  /** Email address. */
  email: string;
  /** Password (never returned by the API). */
  password: string;
};

export const loginRequestSchema: Schema<LoginRequest> = s.object<LoginRequest>({
  email: s.string(),
  password: s.string(),
});
