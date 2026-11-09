"use client";

import type { PurchaseOrderDto } from "@qm/contracts";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Textarea } from "@/components/ui/Field";
import { api, type ApprovalResponse } from "@/lib/api";
import { money } from "@/lib/format";
import { useAction } from "@/lib/hooks";

/**
 * Owner approval for one proposal. Every REVIEW-severity violation must be
 * explicitly acknowledged; the cart hash sent is exactly the one displayed, so
 * the API rejects the approval if the cart changed underneath the owner.
 */
export function ApprovalForm({
  requestId,
  po,
  onApproved,
  onRejected,
}: {
  requestId: string;
  po: PurchaseOrderDto;
  onApproved: (result: ApprovalResponse) => void;
  onRejected: () => void;
}) {
  const reviewCodes = useMemo(
    () => Array.from(new Set((po.policy_decision?.violations ?? []).filter((v) => v.severity === "REVIEW").map((v) => v.code))),
    [po.policy_decision],
  );
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const allAcked = reviewCodes.every((c) => acked.has(c));
  const messages = new Map((po.policy_decision?.violations ?? []).map((v) => [v.code, v.message]));

  const approve = useAction(async () => {
    const result = await api.procurement.approve(requestId, {
      purchase_order_id: po.id,
      cart_hash: po.cart_hash,
      acknowledged_review_codes: reviewCodes.filter((c) => acked.has(c)),
      note: note.trim() || undefined,
    });
    onApproved(result);
  });

  const reject = useAction(async () => {
    await api.procurement.reject(requestId, { reason: reason.trim() });
    setRejectOpen(false);
    onRejected();
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
      <p className="text-[13.5px] font-semibold text-ink">Owner approval</p>
      <p className="mt-0.5 text-[12.5px] text-ink-3">
        Approving signs an Intent Certificate for exactly this cart ({money(po.total_minor, po.currency)}). Payment
        can then only be made for this cart hash.
      </p>

      {reviewCodes.length > 0 ? (
        <fieldset className="mt-3 space-y-2.5">
          <legend className="mb-1 text-[12.5px] font-medium text-review">
            Acknowledge each review item to continue ({acked.size}/{reviewCodes.length})
          </legend>
          {reviewCodes.map((code) => (
            <Checkbox
              key={code}
              checked={acked.has(code)}
              onChange={(e) => toggle(code, e.target.checked)}
              label={
                <>
                  I have reviewed <code className="font-mono text-[12px]">{code}</code>
                </>
              }
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
        <Button variant="danger" onClick={() => setRejectOpen(true)} disabled={approve.pending}>
          Reject
        </Button>
        {!allAcked ? <span className="self-center text-[12px] text-ink-3">Tick every review item to enable approval.</span> : null}
      </div>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${po.number}?`}
        description="The request will be closed. The reason is recorded in the audit log."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void reject.run()}
              loading={reject.pending}
              disabled={reason.trim().length === 0}
            >
              Reject request
            </Button>
          </>
        }
      >
        <Field label="Reason" required>
          {(control) => (
            <Textarea {...control} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
          )}
        </Field>
        <ErrorNotice error={reject.error} className="mt-3" />
      </Dialog>
    </div>
  );
}
