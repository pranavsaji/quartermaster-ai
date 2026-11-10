import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { actorTypeSchema, type ActorType } from "./actor-type.js";

/** A tamper-evident audit log entry; each hash covers the previous one. */
export type AuditEventDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Position in the workspace's audit chain. */
  sequence: number;
  action: string;
  actorType: ActorType;
  /** Id of the related actor. */
  actorId: string | null;
  entityType: string;
  /** Id of the related entity. */
  entityId: string | null;
  data: Record<string, unknown>;
  /** SHA-256 hash of this audit event. */
  hash: string;
  /** Hash of the previous audit event (null for the first). */
  prevHash: string | null;
  /** Request correlation id; quote it to support to find the server logs. */
  correlationId: string | null;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
};

export const auditEventDtoSchema: Schema<AuditEventDto> = s.object<AuditEventDto>({
  id: s.string(),
  sequence: s.int(),
  action: s.string(),
  actorType: actorTypeSchema,
  actorId: s.nullable(s.string()),
  entityType: s.string(),
  entityId: s.nullable(s.string()),
  data: s.record(s.string(), s.unknown()),
  hash: s.string(),
  prevHash: s.nullable(s.string()),
  correlationId: s.nullable(s.string()),
  createdAt: s.string(),
  _keysMap: {
    actorType: "actor_type",
    actorId: "actor_id",
    entityType: "entity_type",
    entityId: "entity_id",
    prevHash: "prev_hash",
    correlationId: "correlation_id",
    createdAt: "created_at",
  },
});
