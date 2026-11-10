import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { findingTypeSchema, type FindingType } from "./finding-type.js";

export type FindingsByType = {
  /** Kind of security finding. */
  type: FindingType;
  count: number;
};

export const findingsByTypeSchema: Schema<FindingsByType> = s.object<FindingsByType>({
  type: findingTypeSchema,
  count: s.int(),
});
