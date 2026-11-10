"use client";

import type { ApprovalResponse, PurchaseOrderDto } from "@qm/contracts";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { violationCopy } from "@/lib/plain-language";
import { useAction } from "@/lib/hooks";
import { isConflictError } from "@/lib/http";

/**
 * Owner approval for one proposal. Every REVIEW-severity violation must be
 * explicitly acknowledged; the cart hash sent is exactly the one displayed, so
 * the API rejects the approval if the cart changed underneath the owner.
 *
 * Acknowledgements belong to one policy decision: render it with
 * `key={po.policy_decision?.id}` so a re-evaluation (e.g. a price premium that
 * grew from 12% to 40%) starts with every box unticked.
 */
export function ApprovalForm({
  requestId,
  po,
  onApproved,
  onReject,
  onConflict,
}: {
  requestId: string;
  po: PurchaseOrderDto;
  onApproved: (result: ApprovalResponse) => void;
  /** Opens the reject dialog, which the card owns so it survives this form unmounting. */
  onReject: () => void;
  /**
   * A 409 (CART_CHANGED, MANDATE_CHANGED, PROPOSAL_NOT_APPROVABLE…): what the owner saw is out of
   * date. The card shows why and reloads the request, which usually unmounts or re-keys this form.
   */
  onConflict: (error: unknown) => void;
}) {
  const reviewCodes = useMemo(
    () => Array.from(new Set((po.policy_decision?.violations ?? []).filter((v) => v.severity === "REVIEW").map((v) => v.code))),
    [po.policy_decision],
  );
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  // Count only codes in the current decision, never a stale tick for a code that is gone.
  const ackedCount = reviewCodes.filter((c) => acked.has(c)).length;
  const allAcked = ackedCount === reviewCodes.length;
  const messages = new Map((po.policy_decision?.violations ?? []).map((v) => [v.code, v.message]));

  const approve = useAction(async () => {
    let result: ApprovalResponse;
    try {
      result = await api.procurement.approve(requestId, {
        purchase_order_id: po.id,
        cart_hash: po.cart_hash,
        acknowledged_review_codes: reviewCodes.filter((c) => acked.has(c)),
        note: note.trim() || undefined,
      });
    } catch (err) {
      if (!isConflictError(err)) throw err;
      onConflict(err);
      return;
    }
    onApproved(result);
  });

  function toggle(code: string, checked: boolean) {
    setAcked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-accent-line bg-accent-soft/40 p-4">
      <p className="text-sm font-semibold text-ink">Your approval</p>
      <p className="mt-0.5 text-xs text-ink-3">
        Approving signs an Intent Certificate for exactly this cart ({money(po.total_minor, po.currency)}). PayPal can then charge only this
        cart, at this total.
      </p>

      {reviewCodes.length > 0 ? (
        <fieldset className="mt-3 space-y-2.5">
          <legend className="mb-1 text-xs font-medium text-review">
            Confirm each point TrustRail raised ({ackedCount} of {reviewCodes.length})
          </legend>
          {reviewCodes.map((code) => (
            <Checkbox
              key={code}
              checked={acked.has(code)}
              onChange={(e) => toggle(code, e.target.checked)}
              label={<>I have reviewed: {violationCopy(code).title.toLowerCase()}</>}
              description={messages.get(code)}
            />
          ))}
        </fieldset>
      ) : null}

      <Field label="Approval note (optional)" className="mt-3">
        {(control) => (
          <Textarea {...control} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-14 bg-surface" />
        )}
      </Field>

      <ErrorNotice error={approve.error} className="mt-3" />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void approve.run()} loading={approve.pending} disabled={!allAcked}>
          Approve &amp; sign
        </Button>
        <Button variant="danger" onClick={onReject} disabled={approve.pending}>
          Reject
        </Button>
        {!allAcked ? <span className="self-center text-xs text-ink-3">Tick each point above to approve.</span> : null}
      </div>
    </div>
  );
}
