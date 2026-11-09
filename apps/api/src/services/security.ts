import { and, desc, eq, lt, type SQL } from "drizzle-orm";
import type { Page, PolicyDecisionDto, SecurityFindingDto, Severity } from "@qm/contracts";
import { auditEvents, policyDecisions, securityFindings, type DbOrTx } from "@qm/database";
import { toFindingDto } from "./findings";
import { toDecisionDto } from "./orders";
import { afterCursor, decodeCursor, newestFirst, toPage } from "./pagination";

export async function listFindings(
  db: DbOrTx,
  organizationId: string,
  q: { limit: number; cursor?: string; severity?: Severity; type?: string },
): Promise<Page<SecurityFindingDto>> {
  const conds: (SQL | undefined)[] = [
    eq(securityFindings.organizationId, organizationId),
    afterCursor(securityFindings.createdAt, securityFindings.id, decodeCursor(q.cursor)),
    q.severity ? eq(securityFindings.severity, q.severity) : undefined,
    q.type ? eq(securityFindings.type, q.type) : undefined,
  ];
  const rows = await db
    .select()
    .from(securityFindings)
    .where(and(...conds))
    .orderBy(...newestFirst(securityFindings.createdAt, securityFindings.id))
    .limit(q.limit + 1);
  const { page, nextCursor } = toPage(rows, q.limit);
  return { items: page.map(toFindingDto), next_cursor: nextCursor };
}

export async function listDecisions(
  db: DbOrTx,
  organizationId: string,
  q: { limit: number; cursor?: string },
): Promise<Page<PolicyDecisionDto>> {
  const rows = await db
    .select()
    .from(policyDecisions)
    .where(
      and(
        eq(policyDecisions.organizationId, organizationId),
        afterCursor(policyDecisions.createdAt, policyDecisions.id, decodeCursor(q.cursor)),
      ),
    )
    .orderBy(...newestFirst(policyDecisions.createdAt, policyDecisions.id))
    .limit(q.limit + 1);
  const { page, nextCursor } = toPage(rows, q.limit);
  return { items: page.map(toDecisionDto), next_cursor: nextCursor };
}

export interface AuditEventDto {
  id: string;
  sequence: number;
  action: string;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  data: Record<string, unknown>;
  hash: string;
  prev_hash: string | null;
  correlation_id: string | null;
  created_at: string;
}

/** Audit events newest first; the cursor is the last sequence number seen. */
export async function listAuditEvents(
  db: DbOrTx,
  organizationId: string,
  q: { limit: number; cursor?: string },
): Promise<Page<AuditEventDto>> {
  const beforeSeq = q.cursor && /^\d{1,15}$/.test(q.cursor) ? Number(q.cursor) : null;
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.organizationId, organizationId), beforeSeq ? lt(auditEvents.sequence, beforeSeq) : undefined))
    .orderBy(desc(auditEvents.sequence))
    .limit(q.limit + 1);
  const page = rows.slice(0, q.limit);
  return {
    items: page.map((e) => ({
      id: e.id,
      sequence: e.sequence,
      action: e.action,
      actor_type: e.actorType,
      actor_id: e.actorId,
      entity_type: e.entityType,
      entity_id: e.entityId,
      data: e.data,
      hash: e.hash,
      prev_hash: e.prevHash,
      correlation_id: e.correlationId,
      created_at: e.createdAt.toISOString(),
    })),
    next_cursor: rows.length > q.limit ? String(page[page.length - 1]!.sequence) : null,
  };
}
