"use client";

import { InventoryAdjustmentRequest, type InventoryItemDto } from "@qm/contracts";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { parseNumberInput } from "@/lib/numbers";

const REASONS: { value: InventoryAdjustmentRequest["reason"]; label: string; sign: 1 | -1 | 0 }[] = [
  { value: "COUNT_CORRECTION", label: "Count correction", sign: 0 },
  { value: "WASTE", label: "Waste / spoilage", sign: -1 },
  { value: "CONSUMPTION", label: "Consumption", sign: -1 },
  { value: "MANUAL_RECEIPT", label: "Manual receipt", sign: 1 },
];

/** Stock adjustment for one item. Mount it only while open so each opening starts blank. */
export function AdjustmentDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItemDto;
  onClose: () => void;
  onSaved: (item: InventoryItemDto) => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<InventoryAdjustmentRequest["reason"]>("COUNT_CORRECTION");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const formId = useId();
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();

  const save = useAction(async (itemId: string, body: InventoryAdjustmentRequest) => {
    const res = await api.inventory.adjust(itemId, body);
    onSaved(res.item);
    onClose();
  });

  const parsedDelta = parseNumberInput(delta);
  const preview = parsedDelta !== null && Number.isInteger(parsedDelta) ? item.on_hand + parsedDelta : null;
  const sign = REASONS.find((r) => r.value === reason)?.sign ?? 0;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (parsedDelta === null) {
      setFieldError(delta.trim() === "" ? "Enter how many units to add or remove." : "Use digits only, like 24 or -12.");
      focusFirstError();
      return;
    }
    const parsed = InventoryAdjustmentRequest.safeParse({
      quantity_delta: parsedDelta,
      reason,
      note: note.trim() || undefined,
    });
    if (!parsed.success) {
      setFieldError("Enter a whole, non-zero number (negative to remove stock).");
      focusFirstError();
      return;
    }
    if (sign !== 0 && Math.sign(parsedDelta) !== sign) {
      setFieldError(
        sign < 0 ? "Waste and consumption remove stock: use a negative number." : "A receipt adds stock: use a positive number.",
      );
      focusFirstError();
      return;
    }
    setFieldError(null);
    void save.run(item.id, parsed.data);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Adjust ${item.name}`}
      description={`Currently ${num(item.on_hand)} ${item.unit} on hand · SKU ${item.sku}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={save.pending}>
            Save adjustment
          </Button>
        </>
      }
    >
      <form ref={containerRef} id={formId} onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Reason" required>
          {(control) => (
            <Select {...control} value={reason} onChange={(e) => setReason(e.target.value as InventoryAdjustmentRequest["reason"])}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={`Quantity change (${item.unit})`}
          required
          error={fieldError}
          hint={preview !== null ? `On hand after adjustment: ${num(preview)} ${item.unit}` : "Use a negative number to remove stock."}
        >
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder={sign < 0 ? "-12" : "24"}
              className="tnum"
            />
          )}
        </Field>
        <Field label="Note" hint="Optional, up to 500 characters.">
          {(control) => (
            <Textarea {...control} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="min-h-16" />
          )}
        </Field>
        <ErrorSummary key={attempt} messages={[fieldError]} />
        <ErrorNotice error={save.error} />
      </form>
    </Dialog>
  );
}
