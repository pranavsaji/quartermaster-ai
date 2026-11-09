"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/http";
import { useAction } from "@/lib/hooks";

/**
 * Asks for a reason and rejects either one proposal (`purchaseOrderId`) or every
 * open proposal on the request. Mount it only while open so the reason and any
 * previous error start fresh each time.
 */
export function RejectDialog({
  requestId,
  purchaseOrderId,
  title,
  description,
  confirmLabel,
  onClose,
  onRejected,
}: {
  requestId: string;
  /** Omit to reject every open proposal on the request. */
  purchaseOrderId?: string;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  /** Called after a rejection, and after a 409 that means the proposals changed underneath us. */
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const reject = useAction(async (text: string) => {
    try {
      await api.procurement.reject(requestId, { reason: text, purchase_order_id: purchaseOrderId });
    } catch (err) {
      // e.g. PROPOSAL_NOT_OPEN: someone else already acted on it. Refresh, and still show why.
      if (err instanceof ApiRequestError && err.status === 409) onRejected();
      throw err;
    }
    onClose();
    onRejected();
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void reject.run(reason.trim())}
            loading={reject.pending}
            disabled={reason.trim().length === 0}
          >
            {confirmLabel}
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
  );
}
