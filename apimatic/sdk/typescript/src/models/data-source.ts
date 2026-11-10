import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Where a piece of commercial data came from (shown as a label in the UI). */
export const DataSource = {
  Channel3Market: "CHANNEL3_MARKET",
  SandboxSupplier: "SANDBOX_SUPPLIER",
  Synthetic: "SYNTHETIC",
  UserEntered: "USER_ENTERED",
} as const;
export type DataSource = (typeof DataSource)[keyof typeof DataSource] | (string & {});

export const dataSourceSchema: EnumSchema<DataSource> = s.enumOf<DataSource>(DataSource);
