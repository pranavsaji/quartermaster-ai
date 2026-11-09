import type { FindingType, SecurityFindingDto, Severity } from "@qm/contracts";
import { securityFindings, type DbOrTx } from "@qm/database";

export interface FindingInput {
  organizationId: string;
  type: FindingType;
  severity: Severity;
  title: string;
  description: string;
  sourceKind: string;
  sourceId?: string | null;
  evidence?: Record<string, unknown>;
  relatedPurchaseOrderId?: string | null;
  relatedRequestId?: string | null;
}

export async function recordFinding(tx: DbOrTx, f: FindingInput) {
  const [row] = await tx
    .insert(securityFindings)
    .values({
      organizationId: f.organizationId,
      type: f.type,
      severity: f.severity,
      title: f.title.slice(0, 300),
      description: f.description.slice(0, 2000),
      sourceKind: f.sourceKind,
      sourceId: f.sourceId ?? null,
      evidence: f.evidence ?? {},
      relatedPurchaseOrderId: f.relatedPurchaseOrderId ?? null,
      relatedRequestId: f.relatedRequestId ?? null,
    })
    .returning();
  return row!;
}

export function toFindingDto(r: typeof securityFindings.$inferSelect): SecurityFindingDto {
  return {
    id: r.id,
    type: r.type as FindingType,
    severity: r.severity,
    title: r.title,
    description: r.description,
    source_kind: r.sourceKind,
    source_id: r.sourceId,
    evidence: r.evidence,
    related_purchase_order_id: r.relatedPurchaseOrderId,
    related_request_id: r.relatedRequestId,
    created_at: r.createdAt.toISOString(),
  };
}
