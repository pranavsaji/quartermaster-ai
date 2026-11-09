"use client";

import { DelayDeliveryRequest, ReceiveDeliveryRequest, type DeliveryDto, type PurchaseOrderDto } from "@qm/contracts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api, unwrapDelivery } from "@/lib/api";
import { date, num, todayIso } from "@/lib/format";
import { useAction } from "@/lib/hooks";

export interface DeliveryTarget {
  po: PurchaseOrderDto;
  delivery: DeliveryDto;
}

/** Mark a delivery received, with the quantity actually received per product line. */
export function ReceiveDialog({
  target,
  onClose,
  onDone,
}: {
  target: DeliveryTarget | null;
  onClose: () => void;
  onDone: (delivery: DeliveryDto) => void;
}) {
  const products = target?.po.items.filter((i) => i.kind === "PRODUCT") ?? [];
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setQty(Object.fromEntries(target.po.items.filter((i) => i.kind === "PRODUCT").map((i) => [i.id, String(i.quantity)])));
    setNote("");
    setFieldError(null);
  }, [target]);

  const receive = useAction(async (deliveryId: string, body: ReceiveDeliveryRequest) => {
    const res = await api.deliveries.receive(deliveryId, body);
    onDone(unwrapDelivery(res));
    onClose();
  });

  function submit() {
    if (!target) return;
    const parsed = ReceiveDeliveryRequest.safeParse({
      lines: products.map((p) => ({ purchase_order_item_id: p.id, quantity_received: Number(qty[p.id] ?? "") })),
      note: note.trim() || undefined,
    });
    if (!parsed.success) {
      setFieldError("Each quantity must be a whole number of 0 or more.");
      return;
    }
    setFieldError(null);
    void receive.run(target.delivery.id, parsed.data);
  }

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      size="lg"
      title={target ? `Receive ${target.po.number}` : "Receive delivery"}
      description={target ? `${target.po.supplier_name} · expected ${date(target.delivery.expected_date)}` : undefined}
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
            <th scope="col" className="w-36 py-2 pl-3 text-right font-medium">
              Received
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {products.map((line) => {
            const received = Number(qty[line.id] ?? "");
            const short = Number.isFinite(received) && received < line.quantity;
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
                    inputMode="numeric"
                    value={qty[line.id] ?? ""}
                    onChange={(e) => setQty((q) => ({ ...q, [line.id]: e.target.value }))}
                    className={short ? "tnum border-review text-right" : "tnum text-right"}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {fieldError ? <p className="mt-2 text-[12px] font-medium text-block">{fieldError}</p> : null}
      <Field label="Note" className="mt-4">
        {(control) => <Textarea {...control} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-14" />}
      </Field>
      <ErrorNotice error={receive.error} className="mt-3" />
    </Dialog>
  );
}

export function DelayDialog({
  target,
  onClose,
  onDone,
}: {
  target: DeliveryTarget | null;
  onClose: () => void;
  onDone: (delivery: DeliveryDto) => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setNewDate("");
    setReason("");
    setFieldError(null);
  }, [target]);

  const delay = useAction(async (deliveryId: string, body: DelayDeliveryRequest) => {
    const res = await api.deliveries.delay(deliveryId, body);
    onDone(unwrapDelivery(res));
    onClose();
  });

  function submit() {
    if (!target) return;
    const parsed = DelayDeliveryRequest.safeParse({ new_expected_date: newDate, reason: reason.trim() });
    if (!parsed.success) {
      setFieldError("Pick a new date and give a reason.");
      return;
    }
    setFieldError(null);
    void delay.run(target.delivery.id, parsed.data);
  }

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      size="sm"
      title={target ? `Report delay for ${target.po.number}` : "Report delay"}
      description={target ? `Currently expected ${date(target.delivery.expected_date)}.` : undefined}
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
        <Field label="New expected date" required error={fieldError}>
          {(control) => (
            <Input {...control} type="date" min={todayIso()} value={newDate} onChange={(e) => setNewDate(e.target.value)} className="tnum" />
          )}
        </Field>
        <Field label="Reason" required>
          {(control) => <Textarea {...control} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} className="min-h-16" />}
        </Field>
        <ErrorNotice error={delay.error} />
      </div>
    </Dialog>
  );
}
