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
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-ink-2">Lines</legend>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-[11.5px] text-ink-3">
            <tr>
              <th scope="col" className="pb-1.5 font-medium">
                SKU
              </th>
              <th scope="col" className="pb-1.5 pl-2 font-medium">
                Description
              </th>
              <th scope="col" className="w-20 pb-1.5 pl-2 font-medium">
                Qty
              </th>
              <th scope="col" className="w-32 pb-1.5 pl-2 font-medium">
                Unit price
              </th>
              <th scope="col" className="w-28 pb-1.5 pl-2 text-right font-medium">
                Line total
              </th>
              <th scope="col" className="w-10 pb-1.5">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const t = lineTotal(l, currency);
              const lineErrors = errors[l.key] ?? {};
              const errorProps = (field: keyof LineErrors) => ({
                "aria-invalid": lineErrors[field] ? (true as const) : undefined,
                "aria-describedby": lineErrors[field] ? `${idBase}-${l.key}-${field}` : undefined,
              });
              const errorText = (field: keyof LineErrors) =>
                lineErrors[field] ? (
                  <p id={`${idBase}-${l.key}-${field}`} className="mt-1 text-[12px] font-medium text-block">
                    {lineErrors[field]}
                  </p>
                ) : null;
              return (
                <tr key={l.key} className="align-top">
                  <td className="py-1">
                    <Input
                      aria-label={`Line ${i + 1} SKU`}
                      value={l.sku}
                      onChange={(e) => updateLine(l.key, { sku: e.target.value })}
                      className="w-28 font-mono text-[12px]"
                    />
                  </td>
                  <td className="py-1 pl-2">
                    <Input
                      aria-label={`Line ${i + 1} description`}
                      aria-required
                      {...errorProps("description")}
                      value={l.description}
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    />
                    {errorText("description")}
                  </td>
                  <td className="py-1 pl-2">
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
                  </td>
                  <td className="py-1 pl-2">
                    <MoneyInput
                      currency={currency}
                      aria-label={`Line ${i + 1} unit price`}
                      aria-required
                      {...errorProps("unitPrice")}
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                    />
                    {errorText("unitPrice")}
                  </td>
                  <td className="tnum py-1 pl-2 text-right leading-9 text-ink-2">{t !== null ? money(t, currency) : "—"}</td>
                  <td className="py-1 pl-1 text-right">
                    <button
                      type="button"
                      onClick={() => onChange((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                      className="rounded p-1.5 text-ink-3 hover:bg-ink/5 hover:text-block disabled:opacity-30"
                      disabled={lines.length === 1}
                      aria-label={`Remove line ${i + 1}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => onChange((ls) => [...ls, blankLine(nextLineKey(ls))])}>
        + Add line
      </Button>
    </fieldset>
  );
}
