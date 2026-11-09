"use client";

import { DelayDeliveryRequest, ReceiveDeliveryRequest, type DeliveryDto, type PurchaseOrderDto } from "@qm/contracts";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api, unwrapDelivery } from "@/lib/api";
import { date, num, todayIso } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { checkNumber, parseNumberInput } from "@/lib/numbers";

export interface DeliveryTarget {
  po: PurchaseOrderDto;
  delivery: DeliveryDto;
}

/**
 * Mark a delivery received, with the quantity actually received per product line.
 * Mount it only while open: every opening starts from the ordered quantities with no stale error.
 */
export function ReceiveDialog({
  target,
  onClose,
  onDone,
}: {
  target: DeliveryTarget;
  onClose: () => void;
  onDone: (delivery: DeliveryDto) => void;
}) {
  const idBase = useId();
  const products = target.po.items.filter((i) => i.kind === "PRODUCT");
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(products.map((i) => [i.id, String(i.quantity)])));
  const [note, setNote] = useState("");
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  const receive = useAction(async (deliveryId: string, body: ReceiveDeliveryRequest) => {
    const res = await api.deliveries.receive(deliveryId, body);
    onDone(unwrapDelivery(res));
    onClose();
  });

  function submit() {
    const errors: Record<string, string> = {};
    const lines = products.map((p) => {
      const checked = checkNumber(qty[p.id] ?? "", { integer: true, min: 0, max: 1_000_000 });
      if (!checked.ok) errors[p.id] = checked.error;
      return { purchase_order_item_id: p.id, quantity_received: checked.ok ? checked.value : -1 };
    });
    setLineErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const parsed = ReceiveDeliveryRequest.safeParse({ lines, note: note.trim() || undefined });
    if (!parsed.success) {
      setLineErrors({ form: "Some lines couldn't be read. Check each quantity and try again." });
      return;
    }
    void receive.run(target.delivery.id, parsed.data);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Receive ${target.po.number}`}
      description={`${target.po.supplier_name} · expected ${date(target.delivery.expected_date)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={receive.pending}>
            Mark received
          </Button>
        </>
      }
    >
      <div className="mb-3">
        <SourceLabel source="SYNTHETIC">Synthetic fulfillment data</SourceLabel>
      </div>
      <table className="w-full text-left text-[13px]">
        <thead className="text-[12px] text-ink-3">
          <tr>
            <th scope="col" className="py-2 font-medium">
              Line
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Ordered
            </th>
            <th scope="col" className="w-40 py-2 pl-3 text-right font-medium">
              Received
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {products.map((line) => {
            const received = parseNumberInput(qty[line.id] ?? "");
            const short = received !== null && received < line.quantity;
            const error = lineErrors[line.id];
            const errorId = `${idBase}-${line.id}-error`;
            return (
              <tr key={line.id}>
                <td className="py-2 pr-2">
                  <p className="text-ink">{line.description}</p>
                  {line.sku ? <p className="font-mono text-[11.5px] text-ink-4">{line.sku}</p> : null}
                </td>
                <td className="tnum py-2 text-right text-ink-2">{num(line.quantity)}</td>
                <td className="py-2 pl-3">
                  <Input
                    aria-label={`Quantity received for ${line.description}`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    aria-required
                    inputMode="numeric"
                    value={qty[line.id] ?? ""}
                    onChange={(e) => setQty((q) => ({ ...q, [line.id]: e.target.value }))}
                    className={short ? "tnum border-review text-right" : "tnum text-right"}
                  />
                  {error ? (
                    <p id={errorId} className="mt-1 text-right text-[12px] font-medium text-block">
                      {error}
                    </p>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {lineErrors.form ? <p className="mt-2 text-[12px] font-medium text-block">{lineErrors.form}</p> : null}
      <Field label="Note" className="mt-4">
        {(control) => <Textarea {...control} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-14" />}
      </Field>
      <ErrorNotice error={receive.error} className="mt-3" />
    </Dialog>
  );
}

/** Report a new expected date. Mount it only while open so each opening starts blank. */
export function DelayDialog({
  target,
  onClose,
  onDone,
}: {
  target: DeliveryTarget;
  onClose: () => void;
  onDone: (delivery: DeliveryDto) => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ date?: string; reason?: string }>({});

  const delay = useAction(async (deliveryId: string, body: DelayDeliveryRequest) => {
    const res = await api.deliveries.delay(deliveryId, body);
    onDone(unwrapDelivery(res));
    onClose();
  });

  function submit() {
    const next: typeof errors = {};
    if (!newDate) next.date = "Pick the new expected date.";
    else if (newDate < todayIso()) next.date = "Pick today or a later date.";
    if (!reason.trim()) next.reason = "Say why the delivery is late.";
    const parsed = DelayDeliveryRequest.safeParse({ new_expected_date: newDate, reason: reason.trim() });
    if (!parsed.success && !next.date && !next.reason) next.date = "Use a valid date.";
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    void delay.run(target.delivery.id, parsed.data);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Report delay for ${target.po.number}`}
      description={`Currently expected ${date(target.delivery.expected_date)}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={delay.pending}>
            Report delay
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SourceLabel source="SYNTHETIC">Synthetic fulfillment data</SourceLabel>
        <Field label="New expected date" required error={errors.date}>
          {(control) => (
            <Input {...control} type="date" min={todayIso()} value={newDate} onChange={(e) => setNewDate(e.target.value)} className="tnum" />
          )}
        </Field>
        <Field label="Reason" required error={errors.reason}>
          {(control) => <Textarea {...control} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} className="min-h-16" />}
        </Field>
        <ErrorNotice error={delay.error} />
      </div>
    </Dialog>
  );
}
