import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { auditEventDtoSchema, type AuditEventDto } from "./audit-event-dto.js";

export type SecurityAuditResponse = {
  items: AuditEventDto[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
};

export const securityAuditResponseSchema: Schema<SecurityAuditResponse> = s.object<SecurityAuditResponse>({
  items: s.array(s.lazy(() => auditEventDtoSchema)),
  nextCursor: s.nullable(s.string()),
  _keysMap: {
    nextCursor: "next_cursor",
  },
});
