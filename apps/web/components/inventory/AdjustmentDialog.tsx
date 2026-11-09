"use client";

import { InventoryAdjustmentRequest, type InventoryItemDto } from "@qm/contracts";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { api, type InventoryAdjustmentInput } from "@/lib/api";
import { num } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { ApiRequestError } from "@/lib/http";
import { checkNumber, type NumberCheck } from "@/lib/numbers";

type Reason = InventoryAdjustmentRequest["reason"];

/**
 * Every quantity is typed as a plain, non-negative number (so the numeric keypad,
 * which has no minus key on iOS, is enough) and the reason decides the direction:
 * waste and consumption remove, a receipt adds, and a count correction takes the
 * counted on-hand quantity and adjusts by the difference.
 */
const REASONS: { value: Reason; label: string; mode: "remove" | "add" | "count" }[] = [
  { value: "COUNT_CORRECTION", label: "Count correction", mode: "count" },
  { value: "WASTE", label: "Waste / spoilage", mode: "remove" },
  { value: "CONSUMPTION", label: "Consumption", mode: "remove" },
  { value: "MANUAL_RECEIPT", label: "Manual receipt", mode: "add" },
];

const MAX_UNITS = 1_000_000;

type Plan = { ok: true; delta: number } | { ok: false; error: string };

/** The signed `quantity_delta` for what was typed, or a message saying what to fix. */
export function planAdjustment(mode: "remove" | "add" | "count", value: string, onHand: number): Plan {
  const checked: NumberCheck = checkNumber(value, { integer: true, min: mode === "count" ? 0 : 1, max: MAX_UNITS });
  if (!checked.ok) {
    if (value.trim() === "") return { ok: false, error: mode === "count" ? "Enter the quantity you counted." : "Enter a quantity." };
    return { ok: false, error: mode === "count" ? `Enter the counted quantity as a whole number, 0 or more.` : checked.error };
  }
  if (mode === "add") return { ok: true, delta: checked.value };
  if (mode === "remove") {
    if (checked.value > onHand) return { ok: false, error: `Only ${num(onHand)} on hand: you can remove at most that many.` };
    return { ok: true, delta: -checked.value };
  }
  const delta = checked.value - onHand;
  if (delta === 0) return { ok: false, error: "That matches the current on-hand quantity, so there is nothing to correct." };
  return { ok: true, delta };
}

function describeDelta(delta: number, unit: string, onHand: number): string {
  const verb = delta < 0 ? "remove" : "add";
  return `Will ${verb} ${num(Math.abs(delta))} ${unit} — on hand after: ${num(onHand + delta)} ${unit}.`;
}

/** The current on-hand quantity a 409 STOCK_CHANGED reports in its details, if it is usable. */
function reportedOnHand(details: unknown): number | null {
  if (typeof details !== "object" || details === null) return null;
  const value = (details as { on_hand?: unknown }).on_hand;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Stock adjustment for one item. Mount it only while open so each opening starts blank.
 *
 * Count corrections and removals are worked out from the on-hand quantity shown, so they are sent
 * with `expected_on_hand`: if someone else changed the stock meanwhile the API refuses (409
 * STOCK_CHANGED) rather than apply a stale delta, and the dialog shows the new quantity to check against.
 */
export function AdjustmentDialog({
  item: initialItem,
  onClose,
  onSaved,
  onItemChanged,
}: {
  item: InventoryItemDto;
  onClose: () => void;
  onSaved: (item: InventoryItemDto) => void;
  /** The item was re-read after a concurrent change (no adjustment was made), e.g. to update its grid row. */
  onItemChanged?: (item: InventoryItemDto) => void;
}) {
  const [item, setItem] = useState(initialItem);
  const [stockChanged, setStockChanged] = useState<{ from: number; to: number } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<Reason>("COUNT_CORRECTION");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const formId = useId();
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();

  const save = useAction(async (body: InventoryAdjustmentInput) => {
    try {
      const res = await api.inventory.adjust(item.id, body);
      onSaved(res.item);
      onClose();
    } catch (err) {
      if (!(err instanceof ApiRequestError && err.status === 409 && err.code === "STOCK_CHANGED")) throw err;
      const reported = reportedOnHand(err.details);
      let fresh: InventoryItemDto = reported === null ? item : { ...item, on_hand: reported };
      try {
        // Re-read the item so available stock, status and cover are current too, not just on hand.
        fresh = (await api.inventory.list()).items.find((i) => i.id === item.id) ?? fresh;
      } catch {
        // The quantity from the 409 is enough to recheck against.
      }
      setStockChanged({ from: item.on_hand, to: fresh.on_hand });
      setItem(fresh);
      onItemChanged?.(fresh);
    }
  });

  const mode = REASONS.find((r) => r.value === reason)?.mode ?? "count";
  const plan = quantity.trim() === "" ? null : planAdjustment(mode, quantity, item.on_hand);

  function changeReason(next: Reason) {
    const nextMode = REASONS.find((r) => r.value === next)?.mode ?? "count";
    // A counted total and an amount to add/remove mean different things: don't carry one over as the other.
    if ((nextMode === "count") !== (mode === "count")) setQuantity("");
    setFieldError(null);
    setReason(next);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = planAdjustment(mode, quantity, item.on_hand);
    const parsed = result.ok
      ? InventoryAdjustmentRequest.safeParse({ quantity_delta: result.delta, reason, note: note.trim() || undefined })
      : null;
    if (!result.ok || !parsed?.success) {
      setFieldError(result.ok ? "Enter a whole number of units." : result.error);
      focusFirstError();
      return;
    }
    setFieldError(null);
    setStockChanged(null);
    // A receipt adds a delivered amount whatever else happened; the others depend on the stock shown.
    void save.run(mode === "add" ? parsed.data : { ...parsed.data, expected_on_hand: item.on_hand });
  }

  const label =
    mode === "count"
      ? `Counted on hand (${item.unit})`
      : mode === "remove"
        ? `Quantity removed (${item.unit})`
        : `Quantity received (${item.unit})`;
  const hint =
    plan?.ok === true
      ? describeDelta(plan.delta, item.unit, item.on_hand)
      : mode === "count"
        ? `Enter what you counted; the adjustment is the difference from ${num(item.on_hand)} ${item.unit}.`
        : mode === "remove"
          ? "Enter how many units to take off stock."
          : "Enter how many units to add to stock.";

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
            <Select {...control} value={reason} onChange={(e) => changeReason(e.target.value as Reason)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={label} required error={fieldError} hint={<span aria-live="polite">{hint}</span>}>
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              autoComplete="off"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={mode === "count" ? String(item.on_hand) : "12"}
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
        {stockChanged ? (
          <Notice tone="review" live title="The stock changed while you were adjusting it">
            Someone else updated {item.name}: it now has {num(stockChanged.to)} {item.unit} on hand (it was {num(stockChanged.from)}).
            Nothing was saved. {mode === "count" ? "Check your count" : "Check the quantity"} and save again.
          </Notice>
        ) : null}
        <ErrorNotice error={save.error} />
      </form>
    </Dialog>
  );
}
