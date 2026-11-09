"use client";

import { InventoryAdjustmentRequest, type InventoryItemDto } from "@qm/contracts";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import { useAction } from "@/lib/hooks";

const REASONS: { value: InventoryAdjustmentRequest["reason"]; label: string; sign: 1 | -1 | 0 }[] = [
  { value: "COUNT_CORRECTION", label: "Count correction", sign: 0 },
  { value: "WASTE", label: "Waste / spoilage", sign: -1 },
  { value: "CONSUMPTION", label: "Consumption", sign: -1 },
  { value: "MANUAL_RECEIPT", label: "Manual receipt", sign: 1 },
];

export function AdjustmentDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItemDto | null;
  onClose: () => void;
  onSaved: (item: InventoryItemDto) => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<InventoryAdjustmentRequest["reason"]>("COUNT_CORRECTION");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const save = useAction(async (itemId: string, body: InventoryAdjustmentRequest) => {
    const res = await api.inventory.adjust(itemId, body);
    onSaved(res.item);
    onClose();
  });

  useEffect(() => {
    if (item) {
      setDelta("");
      setReason("COUNT_CORRECTION");
      setNote("");
      setFieldError(null);
      save.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const parsedDelta = Number(delta);
  const preview = item && delta.trim() !== "" && Number.isInteger(parsedDelta) ? item.on_hand + parsedDelta : null;
  const sign = REASONS.find((r) => r.value === reason)?.sign ?? 0;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    const parsed = InventoryAdjustmentRequest.safeParse({
      quantity_delta: parsedDelta,
      reason,
      note: note.trim() || undefined,
    });
    if (!parsed.success || delta.trim() === "") {
      setFieldError("Enter a whole, non-zero number (negative to remove stock).");
      return;
    }
    if (sign !== 0 && Math.sign(parsedDelta) !== sign) {
      setFieldError(sign < 0 ? "Waste and consumption remove stock: use a negative number." : "A receipt adds stock: use a positive number.");
      return;
    }
    setFieldError(null);
    void save.run(item.id, parsed.data);
  }

  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item ? `Adjust ${item.name}` : "Adjust stock"}
      description={item ? `Currently ${num(item.on_hand)} ${item.unit} on hand · SKU ${item.sku}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="adjust-form" loading={save.pending}>
            Save adjustment
          </Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Reason" required>
          {({ id }) => (
            <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as InventoryAdjustmentRequest["reason"])}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={`Quantity change (${item?.unit ?? "units"})`}
          required
          error={fieldError}
          hint={preview !== null ? `On hand after adjustment: ${num(preview)} ${item?.unit ?? ""}` : "Use a negative number to remove stock."}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              placeholder={sign < 0 ? "-12" : "24"}
              className="tnum"
            />
          )}
        </Field>
        <Field label="Note" hint="Optional, up to 500 characters.">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={describedBy}
              className="min-h-16"
            />
          )}
        </Field>
        <ErrorNotice error={save.error} />
      </form>
    </Dialog>
  );
}
