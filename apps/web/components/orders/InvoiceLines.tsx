"use client";

import type { PurchaseOrderDto } from "@qm/contracts";
import { Button } from "@/components/ui/Button";
import { Input, MoneyInput } from "@/components/ui/Field";
import { inputToMinor, minorToInput, money } from "@/lib/format";
import { checkNumber } from "@/lib/numbers";

export interface LineDraft {
  /** Unique within the current lines; see `nextLineKey`. */
  key: string;
  sku: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export type LineErrors = Partial<Record<"description" | "quantity" | "unitPrice", string>>;

export const QUANTITY_RULE = { integer: true, min: 1, max: 1_000_000 } as const;

export function blankLine(key: string): LineDraft {
  return { key, sku: "", description: "", quantity: "1", unitPrice: "" };
}

/**
 * The first `l<n>` key not used by `lines`. Derived from the lines themselves, so keys are made
 * in event handlers and state updaters rather than by a module-level counter bumped during render.
 */
export function nextLineKey(lines: readonly LineDraft[]): string {
  const used = new Set(lines.map((l) => l.key));
  let n = lines.length;
  while (used.has(`l${n}`)) n += 1;
  return `l${n}`;
}

/** One draft line per line of the purchase order. The form's lines are replaced wholesale, so `l0…` are unique. */
export function linesFromOrder(po: PurchaseOrderDto): LineDraft[] {
  return po.items.map((item, i) => ({
    key: `l${i}`,
    sku: item.sku ?? "",
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: minorToInput(item.unit_price_minor, po.currency),
  }));
}

export function lineTotal(line: LineDraft, currency: string): number | null {
  // Digits only: `Number()` would read "1e2" as 100 and "0x10" as 16.
  const qty = checkNumber(line.quantity, QUANTITY_RULE);
  const unit = inputToMinor(line.unitPrice, currency);
  if (!qty.ok || unit === null) return null;
  const total = qty.value * unit;
  return Number.isSafeInteger(total) ? total : null;
}

/** The editable invoice lines: one row per line with inline errors, plus "Add line". */
export function InvoiceLines({
  lines,
  errors,
  currency,
  idBase,
  onChange,
}: {
  lines: LineDraft[];
  /** Per line, keyed by the line's draft key. */
  errors: Record<string, LineErrors>;
  currency: string;
  /** Prefix for the error message ids, unique to the form. */
  idBase: string;
  onChange: (update: (lines: LineDraft[]) => LineDraft[]) => void;
}) {
  function updateLine(key: string, patch: Partial<LineDraft>) {
    onChange((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  return (
    // min-w-0: a fieldset is as wide as its content by default, which pushed the page sideways on phones.
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium text-ink-2">Lines</legend>
      {/* A table-like grid from sm up; on a phone each line stacks its fields under small captions. */}
      <div
        aria-hidden
        className="hidden grid-cols-[7rem_minmax(0,1fr)_5rem_8rem_7rem_2.75rem] gap-x-2 pb-1.5 text-2xs font-medium text-ink-3 sm:grid"
      >
        <span>SKU</span>
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Line total</span>
        <span />
      </div>
      <ul className="space-y-3 sm:space-y-1">
        {lines.map((l, i) => {
          const t = lineTotal(l, currency);
          const lineErrors = errors[l.key] ?? {};
          const errorProps = (field: keyof LineErrors) => ({
            "aria-invalid": lineErrors[field] ? (true as const) : undefined,
            "aria-describedby": lineErrors[field] ? `${idBase}-${l.key}-${field}` : undefined,
          });
          const errorText = (field: keyof LineErrors) =>
            lineErrors[field] ? (
              <p id={`${idBase}-${l.key}-${field}`} className="mt-1 text-xs font-medium text-block">
                {lineErrors[field]}
              </p>
            ) : null;
          const caption = (text: string) => (
            <span aria-hidden className="mb-1 block text-2xs font-medium text-ink-3 sm:hidden">
              {text}
            </span>
          );
          return (
            <li
              key={l.key}
              className="grid grid-cols-2 gap-x-2 gap-y-2 rounded-lg border border-line p-3 sm:grid-cols-[7rem_minmax(0,1fr)_5rem_8rem_7rem_2.75rem] sm:items-start sm:gap-y-0 sm:rounded-none sm:border-0 sm:p-0"
            >
              <div className="col-span-2 flex items-center justify-between sm:hidden">
                <span className="text-xs font-semibold text-ink-2">Line {i + 1}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                {caption("SKU")}
                <Input
                  aria-label={`Line ${i + 1} SKU`}
                  value={l.sku}
                  onChange={(e) => updateLine(l.key, { sku: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                {caption("Description")}
                <Input
                  aria-label={`Line ${i + 1} description`}
                  aria-required
                  {...errorProps("description")}
                  value={l.description}
                  onChange={(e) => updateLine(l.key, { description: e.target.value })}
                />
                {errorText("description")}
              </div>
              <div>
                {caption("Qty")}
                <Input
                  aria-label={`Line ${i + 1} quantity`}
                  aria-required
                  {...errorProps("quantity")}
                  inputMode="numeric"
                  value={l.quantity}
                  onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                  className="tnum"
                />
                {errorText("quantity")}
              </div>
              <div>
                {caption("Unit price")}
                <MoneyInput
                  currency={currency}
                  aria-label={`Line ${i + 1} unit price`}
                  aria-required
                  {...errorProps("unitPrice")}
                  value={l.unitPrice}
                  onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                />
                {errorText("unitPrice")}
              </div>
              <p className="tnum flex items-center justify-between text-sm text-ink-2 sm:block sm:text-right sm:leading-9">
                <span aria-hidden className="text-2xs font-medium text-ink-3 sm:hidden">
                  Line total
                </span>
                {t !== null ? money(t, currency) : "—"}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onChange((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                  className="grid size-9 place-items-center rounded-md text-base text-ink-3 hover:bg-ink/5 hover:text-block disabled:text-ink-4 disabled:hover:bg-transparent pointer-coarse:size-11"
                  disabled={lines.length === 1}
                  aria-label={`Remove line ${i + 1}`}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => onChange((ls) => [...ls, blankLine(nextLineKey(ls))])}>
        + Add line
      </Button>
    </fieldset>
  );
}
