"use client";

import { AnalyzeInvoiceRequest, type InvoiceDto, type PurchaseOrderDto, type SupplierDto } from "@qm/contracts";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { inputToMinor, minorToInput, money, todayIso } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { checkNumber } from "@/lib/numbers";
import { InvoiceResult } from "./InvoiceResult";

interface LineDraft {
  key: string;
  sku: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

let lineSeq = 0;
const blankLine = (): LineDraft => ({ key: `l${(lineSeq += 1)}`, sku: "", description: "", quantity: "1", unitPrice: "" });

/** A request to fill the form from a purchase order; a new `seq` re-applies it even for the same PO. */
export interface InvoicePrefill {
  po: PurchaseOrderDto;
  seq: number;
}

const QUANTITY_RULE = { integer: true, min: 1, max: 1_000_000 } as const;

function lineTotal(line: LineDraft, currency: string): number | null {
  // Digits only: `Number()` would read "1e2" as 100 and "0x10" as 16.
  const qty = checkNumber(line.quantity, QUANTITY_RULE);
  const unit = inputToMinor(line.unitPrice, currency);
  if (!qty.ok || unit === null) return null;
  const total = qty.value * unit;
  return Number.isSafeInteger(total) ? total : null;
}

type LineErrors = Partial<Record<"description" | "quantity" | "unitPrice", string>>;

export interface InvoiceErrors {
  supplier?: string;
  number?: string;
  date?: string;
  total?: string;
  /** Per line, keyed by the line's draft key. */
  lines: Record<string, LineErrors>;
}

export interface InvoiceDraft {
  supplierId: string;
  poId: string;
  number: string;
  invoiceDate: string;
  lines: LineDraft[];
  totalOverride: string;
  notes: string;
}

/** Turns the form into an API body, or messages attached to the specific fields that need fixing. */
export function validateInvoiceForm(
  draft: InvoiceDraft,
  currency: string,
): { body: AnalyzeInvoiceRequest; errors: null } | { body: null; errors: InvoiceErrors } {
  const errors: InvoiceErrors = { lines: {} };
  if (!draft.supplierId) errors.supplier = "Choose a supplier.";
  if (!draft.number.trim()) errors.number = "Enter the invoice number.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.invoiceDate)) errors.date = "Enter the invoice date.";

  const lines = draft.lines.map((l) => {
    const lineErrors: LineErrors = {};
    if (!l.description.trim()) lineErrors.description = "Enter a description.";
    const qty = checkNumber(l.quantity, QUANTITY_RULE);
    if (!qty.ok) lineErrors.quantity = qty.error;
    const unit = inputToMinor(l.unitPrice, currency);
    if (unit === null) lineErrors.unitPrice = l.unitPrice.trim() ? `Enter a price in ${currency}, like 12.50.` : "Enter the unit price.";
    if (Object.keys(lineErrors).length > 0) errors.lines[l.key] = lineErrors;
    return {
      sku: l.sku.trim() || null,
      description: l.description.trim(),
      quantity: qty.ok ? qty.value : -1,
      unit_price_minor: unit ?? -1,
      line_total_minor: lineTotal(l, currency) ?? -1,
    };
  });

  const computed = lines.every((l) => l.line_total_minor >= 0) ? lines.reduce((sum, l) => sum + l.line_total_minor, 0) : null;
  const total = draft.totalOverride.trim() ? inputToMinor(draft.totalOverride, currency) : computed;
  if (draft.totalOverride.trim() && total === null) errors.total = `Enter a total in ${currency}, like 1,250.00.`;

  const hasErrors = Boolean(errors.supplier || errors.number || errors.date || errors.total) || Object.keys(errors.lines).length > 0;
  if (hasErrors) return { body: null, errors };
  const parsed = AnalyzeInvoiceRequest.safeParse({
    supplier_id: draft.supplierId,
    purchase_order_id: draft.poId || null,
    invoice_number: draft.number.trim(),
    invoice_date: draft.invoiceDate,
    currency,
    lines,
    total_minor: total ?? -1,
    notes: draft.notes.trim() || undefined,
  });
  if (!parsed.success) {
    // Anything the field checks above don't cover (e.g. a total too large to represent).
    const where = parsed.error.issues[0]?.path[0];
    if (where === "supplier_id") errors.supplier = "Choose a supplier.";
    else if (where === "invoice_number") errors.number = "Use at most 64 characters.";
    else errors.total = "Enter a valid invoice total.";
    return { body: null, errors };
  }
  return { body: parsed.data, errors: null };
}

/** Every message in reading order, for the error summary. */
function errorMessages(errors: InvoiceErrors, lines: LineDraft[]): string[] {
  const out = [errors.supplier, errors.number, errors.date];
  lines.forEach((l, i) => {
    const e = errors.lines[l.key];
    if (!e) return;
    for (const [field, label] of [
      ["description", "description"],
      ["quantity", "quantity"],
      ["unitPrice", "unit price"],
    ] as const) {
      if (e[field]) out.push(`Line ${i + 1} ${label}: ${e[field]}`);
    }
  });
  out.push(errors.total);
  return out.filter((m): m is string => Boolean(m));
}

const NO_ERRORS: InvoiceErrors = { lines: {} };

/**
 * Supplier invoice analysis: the API matches the invoice against the PO,
 * receipts and prior invoices (duplicates) and decides whether settlement may
 * proceed. Supplier notes are untrusted and are scanned for prompt injection.
 */
export function InvoiceForm({
  suppliers,
  orders,
  currency,
  timeZone,
  prefill,
  onAnalyzed,
}: {
  suppliers: SupplierDto[];
  orders: PurchaseOrderDto[];
  currency: string;
  /** The organisation's IANA zone, for the default invoice date. */
  timeZone?: string;
  /** Set by the orders grid's "Invoice" action. */
  prefill: InvoicePrefill | null;
  onAnalyzed: (invoice: InvoiceDto) => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [poId, setPoId] = useState("");
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => todayIso(timeZone));
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [notes, setNotes] = useState("");
  const [totalOverride, setTotalOverride] = useState("");
  const [errors, setErrors] = useState<InvoiceErrors>(NO_ERRORS);
  const idBase = useId();
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const [result, setResult] = useState<InvoiceDto | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<AnalyzeInvoiceRequest | null>(null);
  const [lastWasDuplicateSim, setLastWasDuplicateSim] = useState(false);

  const analyze = useAction(async (body: AnalyzeInvoiceRequest, simulatedDuplicate: boolean) => {
    const invoice = await api.invoices.analyze(body);
    setResult(invoice);
    setLastSubmitted(body);
    setLastWasDuplicateSim(simulatedDuplicate);
    onAnalyzed(invoice);
  });

  function prefillFrom(po: PurchaseOrderDto) {
    setSupplierId(po.supplier_id);
    setPoId(po.id);
    setNumber(`INV-${po.number.replace(/^PO-?/i, "")}`);
    setInvoiceDate(todayIso(timeZone));
    setLines(
      po.items.map((item) => ({
        key: `l${(lineSeq += 1)}`,
        sku: item.sku ?? "",
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: minorToInput(item.unit_price_minor, po.currency),
      })),
    );
    setTotalOverride("");
    setNotes("");
    setResult(null);
    setErrors(NO_ERRORS);
    analyze.reset();
  }

  // Apply a new prefill request while rendering (React's "adjust state when a prop changes"
  // pattern) instead of exposing an imperative handle.
  const [appliedPrefill, setAppliedPrefill] = useState<number | null>(null);
  if (prefill && prefill.seq !== appliedPrefill) {
    setAppliedPrefill(prefill.seq);
    prefillFrom(prefill.po);
  }

  // A prefill comes from the orders grid's "Invoice" action: bring the form into view and move
  // focus to it, so keyboard and screen-reader users land where the work continues.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heading = headingRef.current;
    if (appliedPrefill === null || !heading) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    heading.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  }, [appliedPrefill]);

  const computedTotal = lines.reduce<number | null>((sum, l) => {
    const t = lineTotal(l, currency);
    return sum === null || t === null ? null : sum + t;
  }, 0);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = validateInvoiceForm({ supplierId, poId, number, invoiceDate, lines, totalOverride, notes }, currency);
    setErrors(result.errors ?? NO_ERRORS);
    if (!result.body) {
      focusFirstError();
      return;
    }
    void analyze.run(result.body, false);
  }

  function simulateDuplicate() {
    if (!lastSubmitted) return;
    // Same supplier, same invoice number, same lines: a new submission (new idempotency key).
    void analyze.run({ ...lastSubmitted }, true);
  }

  const supplierOrders = supplierId ? orders.filter((o) => o.supplier_id === supplierId) : orders;

  return (
    <Card aria-labelledby="invoice-form-title" className="scroll-mt-20">
      <form ref={containerRef} onSubmit={submit} noValidate>
        <CardHeader
          id="invoice-form-title"
          headingRef={headingRef}
          title="Analyze a supplier invoice"
          description="Matches the invoice against the purchase order and previous invoices before anything is settled."
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Supplier" required error={errors.supplier}>
              {(control) => (
                <Select
                  {...control}
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setPoId("");
                  }}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Purchase order" hint="Choosing one prefills the lines from the PO.">
              {(control) => (
                <Select
                  {...control}
                  value={poId}
                  onChange={(e) => {
                    const po = orders.find((o) => o.id === e.target.value);
                    if (po) prefillFrom(po);
                    else setPoId("");
                  }}
                >
                  <option value="">No PO (unmatched)</option>
                  {supplierOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number} · {o.supplier_name} · {money(o.total_minor, o.currency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Invoice number" required error={errors.number}>
              {(control) => (
                <Input {...control} value={number} onChange={(e) => setNumber(e.target.value)} maxLength={64} className="font-mono" />
              )}
            </Field>
            <Field label="Invoice date" required error={errors.date}>
              {(control) => (
                <Input {...control} type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="tnum" />
              )}
            </Field>
          </div>

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
                    const lineErrors = errors.lines[l.key] ?? {};
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
                            onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
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
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setLines((ls) => [...ls, blankLine()])}>
              + Add line
            </Button>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Invoice total"
              error={errors.total}
              hint={`Sum of lines: ${computedTotal !== null ? money(computedTotal, currency) : "—"}. Override to test a mismatched total.`}
            >
              {(control) => (
                <MoneyInput
                  {...control}
                  currency={currency}
                  value={totalOverride}
                  onChange={(e) => setTotalOverride(e.target.value)}
                  placeholder={computedTotal !== null ? minorToInput(computedTotal, currency) : ""}
                />
              )}
            </Field>
            <Field label="Supplier notes" hint="Free text from the document. Treated as untrusted and scanned for injected instructions.">
              {(control) => (
                <Textarea
                  {...control}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={5000}
                  className="min-h-[38px]"
                  rows={2}
                />
              )}
            </Field>
          </div>

          <ErrorSummary key={attempt} messages={errorMessages(errors, lines)} />
          <ErrorNotice error={analyze.error} title="Invoice analysis failed" />
          {result ? (
            <div className="space-y-2">
              {lastWasDuplicateSim ? (
                <Notice tone="info">Resubmitted invoice {result.invoice_number} a second time to demonstrate duplicate detection.</Notice>
              ) : null}
              <InvoiceResult invoice={result} />
            </div>
          ) : null}
        </CardBody>
        <CardFooter className="justify-between">
          <Button
            variant="secondary"
            onClick={simulateDuplicate}
            disabled={!lastSubmitted || analyze.pending}
            title={lastSubmitted ? `Resubmit invoice ${lastSubmitted.invoice_number} with the same number` : "Analyze an invoice first"}
          >
            Simulate duplicate invoice
          </Button>
          <Button type="submit" variant="primary" loading={analyze.pending}>
            Analyze invoice
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
