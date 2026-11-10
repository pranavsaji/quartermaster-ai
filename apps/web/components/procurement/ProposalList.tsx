"use client";

import type { PurchaseOrderDto } from "@qm/contracts";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { Icons } from "@/components/shell/icons";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { plural } from "@/lib/format";
import { isApprovable, isBlockedByTrustRail, isEvidenceOnly, ProposalCard } from "./ProposalCard";
import { RejectDialog } from "./RejectDialog";

/** Proposals that still need the owner: approve first, then pay. */
function needsAction(po: PurchaseOrderDto): number {
  if (isApprovable(po)) return 0;
  if (po.status === "APPROVED" || po.status === "PAYMENT_PENDING") return 1;
  return 2;
}

/** Split and order a request's proposals: what can be acted on, and what is kept only as evidence. */
export function groupProposals(proposals: readonly PurchaseOrderDto[]) {
  const byAge = [...proposals].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const live = byAge.filter((p) => !isEvidenceOnly(p)).sort((a, b) => needsAction(a) - needsAction(b));
  const evidence = byAge.filter(isEvidenceOnly).sort((a, b) => Number(isBlockedByTrustRail(b)) - Number(isBlockedByTrustRail(a)));
  return {
    live,
    evidence,
    ready: live.filter(isApprovable).length,
    // Only carts TrustRail's decision refused; a cart replaced after a review flag is not "blocked".
    blocked: byAge.filter(isBlockedByTrustRail).length,
    replaced: byAge.filter((p) => p.status === "SUPERSEDED" && !isBlockedByTrustRail(p)).length,
    open: byAge.filter((p) => p.status === "PROPOSED").length,
  };
}

/**
 * A request's proposals: the carts the owner can approve (approvable first), then the evidence —
 * carts TrustRail blocked and carts replaced by a newer plan — in a compact, read-only form.
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
  const g = groupProposals(proposals);

  return (
    <div className="space-y-8">
      <section id="proposals" aria-labelledby="proposals-title" className="scroll-mt-32">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="proposals-title" className="mr-1 text-lg font-semibold tracking-[-0.01em] text-ink">
            Proposals
          </h2>
          {g.ready > 0 ? (
            <Badge tone="accent" size="md" dot>
              {g.ready} ready for review
            </Badge>
          ) : null}
          {g.blocked > 0 ? (
            <Badge tone="block" size="md" dot>
              {g.blocked} blocked by TrustRail
            </Badge>
          ) : null}
          {g.open > 1 && can("reject") ? (
            <Popover
              className="ml-auto"
              label="More proposal actions"
              trigger={<Icons.more className="size-4" />}
              triggerClassName="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-ink/5 hover:text-ink pointer-coarse:size-11"
            >
              {(close) => (
                <PopoverItem
                  tone="block"
                  onClick={() => {
                    close();
                    setRejectAllOpen(true);
                  }}
                >
                  Reject all {g.open} open proposals…
                </PopoverItem>
              )}
            </Popover>
          ) : null}
        </div>
        <p className="mb-4 text-xs text-ink-3">
          Each supplier cart is approved and paid on its own. Approving signs an Intent Certificate for exactly that cart.
        </p>
        {g.live.length === 0 ? (
          <EmptyState
            title={proposals.length === 0 ? "No proposals yet" : "Nothing to approve"}
            description={
              proposals.length === 0
                ? "Proposals appear here once research has planned a cart."
                : "Every cart on this request was blocked or replaced; the evidence is below."
            }
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-2">
            {g.live.map((po) => (
              <ProposalCard key={po.id} requestId={requestId} po={po} onChange={onChange} onReload={onReload} />
            ))}
          </div>
        )}
      </section>

      {g.evidence.length > 0 ? (
        <section id="evidence" aria-labelledby="evidence-title" className="scroll-mt-32">
          <h2 id="evidence-title" className="text-lg font-semibold tracking-[-0.01em] text-ink">
            Evidence
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-ink-3">
            {[
              g.blocked > 0 ? `${plural(g.blocked, "cart")} TrustRail blocked` : null,
              g.replaced > 0 ? `${plural(g.replaced, "cart")} replaced by a newer plan` : null,
            ]
              .filter(Boolean)
              .join(" and ")}
            . Kept for the audit trail; none of these can be approved or paid.
          </p>
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            {g.evidence.map((po) => (
              <ProposalCard key={po.id} requestId={requestId} po={po} onChange={onChange} onReload={onReload} compact />
            ))}
          </div>
        </section>
      ) : null}

      {rejectAllOpen ? (
        <RejectDialog
          requestId={requestId}
          title={`Reject all ${g.open} open proposals?`}
          description="Every proposal still awaiting approval on this request is rejected. Approved or paid carts are not affected. The reason is recorded in the audit log."
          confirmLabel={`Reject ${g.open} proposals`}
          onClose={() => setRejectAllOpen(false)}
          onRejected={onReload}
        />
      ) : null}
    </div>
  );
}
