import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Workspace role: owners approve and pay, managers request, viewers read. */
export const Role = {
  Owner: "OWNER",
  Manager: "MANAGER",
  Viewer: "VIEWER",
} as const;
export type Role = (typeof Role)[keyof typeof Role] | (string & {});

export const roleSchema: EnumSchema<Role> = s.enumOf<Role>(Role);
