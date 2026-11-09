"use client";

import type { PurchaseOrderDto } from "@qm/contracts";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { isApprovable, isEvidenceOnly, ProposalCard } from "./ProposalCard";
import { RejectDialog } from "./RejectDialog";

/**
 * All proposals for a request, oldest first, so a blocked cart sits right next
 * to the compliant replacement the agent produced after TrustRail rejected it.
 */
export function ProposalList({
  requestId,
  proposals,
  onChange,
  onReload,
}: {
  requestId: string;
  proposals: PurchaseOrderDto[];
  onChange: (po: PurchaseOrderDto) => void;
  /** Reload the request: the proposals changed on the server (a rejection, or a 409 conflict). */
  onReload: () => void;
}) {
  const { can } = useSession();
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  if (proposals.length === 0) {
    return <EmptyState title="No proposals yet" description="Proposals appear here once research has planned a cart." />;
  }
  const ordered = [...proposals].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const blocked = ordered.filter((p) => isEvidenceOnly(p) || p.policy_decision?.decision === "BLOCK").length;
  const ready = ordered.filter(isApprovable).length;
  const open = ordered.filter((p) => p.status === "PROPOSED").length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="neutral" size="md">
          {ordered.length} proposal{ordered.length === 1 ? "" : "s"}
        </Badge>
        {ready > 0 ? (
          <Badge tone="accent" size="md" dot>
            {ready} ready for review
          </Badge>
        ) : null}
        {blocked > 0 ? (
          <Badge tone="block" size="md" dot>
            {blocked} blocked by TrustRail
          </Badge>
        ) : null}
        <span className="text-[12.5px] text-ink-3">Each supplier cart is approved and paid independently.</span>
        {open > 1 && can("reject") ? (
          <Button size="sm" variant="danger" className="ml-auto" onClick={() => setRejectAllOpen(true)}>
            Reject all open proposals ({open})
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-2">
        {ordered.map((po) => (
          <ProposalCard key={po.id} requestId={requestId} po={po} onChange={onChange} onReload={onReload} />
        ))}
      </div>
      {rejectAllOpen ? (
        <RejectDialog
          requestId={requestId}
          title={`Reject all ${open} open proposals?`}
          description="Every proposal still awaiting approval on this request is rejected. Approved or paid carts are not affected. The reason is recorded in the audit log."
          confirmLabel={`Reject ${open} proposals`}
          onClose={() => setRejectAllOpen(false)}
          onRejected={onReload}
        />
      ) : null}
    </div>
  );
}
