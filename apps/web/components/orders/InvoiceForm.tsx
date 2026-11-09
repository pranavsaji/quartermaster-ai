"use client";

import { AnalyzeInvoiceRequest, type InvoiceDto, type PurchaseOrderDto, type SupplierDto } from "@qm/contracts";
import { forwardRef, useImperativeHandle, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { inputToMinor, minorToInput, money, todayIso } from "@/lib/format";
import { useAction } from "@/lib/hooks";
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

export interface InvoiceFormHandle {
  prefillFrom: (po: PurchaseOrderDto) => void;
}

function lineTotal(line: LineDraft, currency: string): number | null {
  const qty = Number(line.quantity);
  const unit = inputToMinor(line.unitPrice, currency);
  if (!Number.isInteger(qty) || qty <= 0 || unit === null) return null;
  return qty * unit;
}

/**
 * Supplier invoice analysis: the API matches the invoice against the PO,
 * receipts and prior invoices (duplicates) and decides whether settlement may
 * proceed. Supplier notes are untrusted and are scanned for prompt injection.
 */
export const InvoiceForm = forwardRef<
  InvoiceFormHandle,
  {
    suppliers: SupplierDto[];
    orders: PurchaseOrderDto[];
    currency: string;
    onAnalyzed: (invoice: InvoiceDto) => void;
  }
>(function InvoiceForm({ suppliers, orders, currency, onAnalyzed }, ref) {
  const [supplierId, setSupplierId] = useState("");
  const [poId, setPoId] = useState("");
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [notes, setNotes] = useState("");
  const [totalOverride, setTotalOverride] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
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
    setInvoiceDate(todayIso());
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
    setFormError(null);
    analyze.reset();
  }

  useImperativeHandle(ref, () => ({ prefillFrom }));

  const computedTotal = lines.reduce<number | null>((sum, l) => {
    const t = lineTotal(l, currency);
    return sum === null || t === null ? null : sum + t;
  }, 0);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const total = totalOverride.trim() ? inputToMinor(totalOverride, currency) : computedTotal;
    const builtLines = lines.map((l) => ({
      sku: l.sku.trim() || null,
      description: l.description.trim(),
      quantity: Number(l.quantity),
      unit_price_minor: inputToMinor(l.unitPrice, currency) ?? -1,
      line_total_minor: lineTotal(l, currency) ?? -1,
    }));
    const parsed = AnalyzeInvoiceRequest.safeParse({
      supplier_id: supplierId,
      purchase_order_id: poId || null,
      invoice_number: number.trim(),
      invoice_date: invoiceDate,
      currency,
      lines: builtLines,
      total_minor: total ?? -1,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first?.path.join(".") ?? "form";
      setFormError(
        where.startsWith("supplier_id")
          ? "Choose a supplier."
          : where.startsWith("lines")
            ? "Every line needs a description, a whole quantity and a valid unit price."
            : where.startsWith("invoice_number")
              ? "Enter the invoice number."
              : where.startsWith("total_minor")
                ? "Enter a valid invoice total."
                : (first?.message ?? "Check the form."),
      );
      return;
    }
    setFormError(null);
    void analyze.run(parsed.data, false);
  }

  function simulateDuplicate() {
    if (!lastSubmitted) return;
    // Same supplier, same invoice number, same lines: a new submission (new idempotency key).
    void analyze.run({ ...lastSubmitted }, true);
  }

  const supplierOrders = supplierId ? orders.filter((o) => o.supplier_id === supplierId) : orders;

  return (
    <Card aria-labelledby="invoice-form-title">
      <form onSubmit={submit} noValidate>
        <CardHeader
          id="invoice-form-title"
          title="Analyze a supplier invoice"
          description="Matches the invoice against the purchase order and previous invoices before anything is settled."
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Supplier" required>
              {({ id }) => (
                <Select id={id} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPoId(""); }}>
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
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  value={poId}
                  aria-describedby={describedBy}
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
            <Field label="Invoice number" required>
              {({ id }) => <Input id={id} value={number} onChange={(e) => setNumber(e.target.value)} maxLength={64} className="font-mono" />}
            </Field>
            <Field label="Invoice date" required>
              {({ id }) => <Input id={id} type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="tnum" />}
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Lines</legend>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[11.5px] text-ink-3">
                  <tr>
                    <th scope="col" className="pb-1.5 font-medium">SKU</th>
                    <th scope="col" className="pb-1.5 pl-2 font-medium">Description</th>
                    <th scope="col" className="w-20 pb-1.5 pl-2 font-medium">Qty</th>
                    <th scope="col" className="w-32 pb-1.5 pl-2 font-medium">Unit price</th>
                    <th scope="col" className="w-28 pb-1.5 pl-2 text-right font-medium">Line total</th>
                    <th scope="col" className="w-10 pb-1.5"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const t = lineTotal(l, currency);
                    return (
                      <tr key={l.key}>
                        <td className="py-1"><Input aria-label={`Line ${i + 1} SKU`} value={l.sku} onChange={(e) => updateLine(l.key, { sku: e.target.value })} className="w-28 font-mono text-[12px]" /></td>
                        <td className="py-1 pl-2"><Input aria-label={`Line ${i + 1} description`} value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} /></td>
                        <td className="py-1 pl-2"><Input aria-label={`Line ${i + 1} quantity`} inputMode="numeric" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} className="tnum" /></td>
                        <td className="py-1 pl-2"><MoneyInput aria-label={`Line ${i + 1} unit price`} value={l.unitPrice} onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })} /></td>
                        <td className="tnum py-1 pl-2 text-right text-ink-2">{t !== null ? money(t, currency) : "—"}</td>
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
            <Field label="Invoice total" hint={`Sum of lines: ${computedTotal !== null ? money(computedTotal, currency) : "—"}. Override to test a mismatched total.`}>
              {({ id, describedBy }) => (
                <MoneyInput id={id} value={totalOverride} onChange={(e) => setTotalOverride(e.target.value)} aria-describedby={describedBy} placeholder={computedTotal !== null ? minorToInput(computedTotal, currency) : ""} />
              )}
            </Field>
            <Field label="Supplier notes" hint="Free text from the document. Treated as untrusted and scanned for injected instructions.">
              {({ id, describedBy }) => (
                <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby={describedBy} maxLength={5000} className="min-h-[38px]" rows={2} />
              )}
            </Field>
          </div>

          {formError ? <p className="text-[12.5px] font-medium text-block" role="alert">{formError}</p> : null}
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
});
