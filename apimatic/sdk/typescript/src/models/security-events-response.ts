import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { securityFindingDtoSchema, type SecurityFindingDto } from "./security-finding-dto.js";

export type SecurityEventsResponse = {
  items: SecurityFindingDto[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
};

export const securityEventsResponseSchema: Schema<SecurityEventsResponse> = s.object<SecurityEventsResponse>({
  items: s.array(s.lazy(() => securityFindingDtoSchema)),
  nextCursor: s.nullable(s.string()),
  _keysMap: {
    nextCursor: "next_cursor",
  },
});
