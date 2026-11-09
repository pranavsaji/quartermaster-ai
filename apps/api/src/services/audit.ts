import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { auditEvents, type DbOrTx } from "@qm/database";
import { digest } from "@qm/trustrail";
import { currentScope } from "../context";

export type ActorType = "USER" | "SYSTEM" | "AGENT" | "PAYPAL";

export interface AuditInput {
  organizationId: string;
  action: string;
  actorType: ActorType;
  actorId?: string | null;
  entityType: string;
  entityId?: string | null;
  data?: Record<string, unknown>;
}

/**
 * Makes arbitrary event data safe for canonical hashing: non-integer numbers become strings,
 * dates become ISO strings, undefined is dropped. The stored data is exactly what was hashed.
 */
export function toHashable(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toHashable);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = toHashable(v);
    }
    return out;
  }
  // Only symbols and functions remain; they never appear in audit data.
  return "[unserializable]";
}

export function auditHash(e: {
  organizationId: string;
  sequence: number;
  action: string;
  actorType: string;
  actorId: string | null;
  entityType: string;
  entityId: string | null;
  data: unknown;
  prevHash: string | null;
  createdAt: string;
  correlationId: string | null;
}): string {
  return digest({
    v: 1,
    organization_id: e.organizationId,
    sequence: e.sequence,
    action: e.action,
    actor_type: e.actorType,
    actor_id: e.actorId,
    entity_type: e.entityType,
    entity_id: e.entityId,
    data: e.data as never,
    prev_hash: e.prevHash,
    created_at: e.createdAt,
    correlation_id: e.correlationId,
  });
}

/**
 * Appends a tamper-evident audit event. Each event's hash covers the previous event's hash, so
 * altering or deleting any historical row breaks verification of every later row. A per-org
 * transaction-scoped advisory lock serialises appends.
 */
export async function appendAudit(db: DbOrTx, input: AuditInput): Promise<{ id: string; sequence: number; hash: string }> {
  // Always run inside a transaction (a savepoint when nested) so the advisory lock is held until
  // the event is committed; in autocommit mode it would be released before the insert.
  return db.transaction((tx) => appendInTransaction(tx, input));
}

async function appendInTransaction(tx: DbOrTx, input: AuditInput): Promise<{ id: string; sequence: number; hash: string }> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`audit:${input.organizationId}`}))`);
  const [last] = await tx
    .select({ sequence: auditEvents.sequence, hash: auditEvents.hash })
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, input.organizationId))
    .orderBy(desc(auditEvents.sequence))
    .limit(1);
  const sequence = (last?.sequence ?? 0) + 1;
  const prevHash = last?.hash ?? null;
  // Audit time is wall-clock time, deliberately not the injectable application clock: the log
  // records when something actually happened. A JavaScript Date has millisecond precision, so the
  // value stored in PostgreSQL (microseconds) round-trips exactly and the hash stays verifiable.
  const createdAt = new Date();
  const createdIso = createdAt.toISOString();
  const data = (toHashable(input.data ?? {}) ?? {}) as Record<string, unknown>;
  const scope = currentScope();
  const correlationId = scope?.correlationId ?? null;
  const actorId = input.actorId ?? null;
  const entityId = input.entityId ?? null;
  const hash = auditHash({
    organizationId: input.organizationId,
    sequence,
    action: input.action,
    actorType: input.actorType,
    actorId,
    entityType: input.entityType,
    entityId,
    data,
    prevHash,
    createdAt: createdIso,
    correlationId,
  });
  const [row] = await tx
    .insert(auditEvents)
    .values({
      organizationId: input.organizationId,
      sequence,
      action: input.action,
      actorType: input.actorType,
      actorId,
      entityType: input.entityType,
      entityId,
      data,
      prevHash,
      hash,
      correlationId,
      createdAt,
    })
    .returning({ id: auditEvents.id });
  return { id: row!.id, sequence, hash };
}

const VERIFY_BATCH = 1_000;

/**
 * Recomputes the organisation's hash chain from the first event. Reads in fixed-size batches so
 * memory stays bounded however long the log grows.
 */
export async function verifyAuditChain(db: DbOrTx, organizationId: string): Promise<{ valid: boolean; events_checked: number; first_invalid_sequence: number | null }> {
  let prev: string | null = null;
  let expectedSeq = 1;
  let checked = 0;
  for (;;) {
    const rows = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.organizationId, organizationId), gte(auditEvents.sequence, expectedSeq)))
      .orderBy(asc(auditEvents.sequence))
      .limit(VERIFY_BATCH);
    for (const r of rows) {
      checked++;
      const recomputed = auditHash({
        organizationId: r.organizationId,
        sequence: r.sequence,
        action: r.action,
        actorType: r.actorType,
        actorId: r.actorId,
        entityType: r.entityType,
        entityId: r.entityId,
        data: r.data,
        prevHash: r.prevHash,
        createdAt: r.createdAt.toISOString(),
        correlationId: r.correlationId,
      });
      if (r.sequence !== expectedSeq || r.prevHash !== prev || recomputed !== r.hash) {
        return { valid: false, events_checked: checked, first_invalid_sequence: r.sequence };
      }
      prev = r.hash;
      expectedSeq++;
    }
    if (rows.length < VERIFY_BATCH) break;
  }
  return { valid: true, events_checked: checked, first_invalid_sequence: null };
}
