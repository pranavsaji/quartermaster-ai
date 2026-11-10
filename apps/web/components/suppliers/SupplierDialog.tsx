"use client";

import type { SupplierDetailDto, SupplierDto } from "@qm/contracts";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import {
  emptyFee,
  emptySupplierForm,
  formToSupplierInput,
  supplierToForm,
  type FeeRow,
  type SupplierFormErrors,
  type SupplierFormState,
} from "./supplier-form-state";

/**
 * Add a supplier, or edit one (`supplier` given). Mount only while open. Approving the supplier
 * for purchases is a separate, owner-only step on the Spend mandate page.
 */
export function SupplierDialog({
  supplier,
  currency,
  onClose,
  onSaved,
}: {
  supplier?: SupplierDto;
  currency: string;
  onClose: () => void;
  onSaved: (supplier: SupplierDetailDto) => void;
}) {
  const [form, setForm] = useState<SupplierFormState>(() => (supplier ? supplierToForm(supplier, currency) : emptySupplierForm()));
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const formId = useId();
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const save = useAction(async (body: Parameters<typeof api.suppliers.create>[0]) => {
    const result = supplier ? await api.suppliers.update(supplier.id, body) : await api.suppliers.create(body);
    onSaved(result.supplier);
    onClose();
  });

  const set = <K extends keyof SupplierFormState>(key: K, value: SupplierFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setFee = (key: string, patch: Partial<FeeRow>) =>
    setForm((f) => ({ ...f, fees: f.fees.map((fee) => (fee.key === key ? { ...fee, ...patch } : fee)) }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = formToSupplierInput(form, currency);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstError();
      return;
    }
    setErrors({});
    void save.run(result.value);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={supplier ? `Edit ${supplier.name}` : "Add a supplier"}
      description="Terms here are what TrustRail checks every quote against: any fee not listed is flagged as unauthorized."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={save.pending}>
            {supplier ? "Save changes" : "Add supplier"}
          </Button>
        </>
      }
    >
      <form ref={containerRef} id={formId} onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} required>
            {(control) => <Input {...control} value={form.name} onChange={(e) => set("name", e.target.value)} />}
          </Field>
          <Field label="Website" error={errors.website} hint="Optional.">
            {(control) => (
              <Input
                {...control}
                type="url"
                inputMode="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://supplier.example"
              />
            )}
          </Field>
          <Field label="Lead time (days)" error={errors.leadTimeDays} hint="Days from order to delivery." required>
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                className="tnum"
                value={form.leadTimeDays}
                onChange={(e) => set("leadTimeDays", e.target.value)}
              />
            )}
          </Field>
          <Field label="Sales tax (%)" error={errors.taxPercent} hint="Applied to products; 0 for tax-exempt suppliers." required>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                className="tnum"
                value={form.taxPercent}
                onChange={(e) => set("taxPercent", e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Description" hint="Optional. Shown to the agent only after prompt-injection screening.">
          {(control) => (
            <Textarea
              {...control}
              className="min-h-16"
              maxLength={1000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink-2">Delivery and fees</legend>
          {form.fees.length === 0 ? <p className="text-xs text-ink-3">No fees: deliveries are free.</p> : null}
          {form.fees.map((fee, i) => (
            <div
              key={fee.key}
              className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-start"
            >
              <Field label="Label" error={errors[`fees.${i}.label`]} required>
                {(control) => <Input {...control} value={fee.label} onChange={(e) => setFee(fee.key, { label: e.target.value })} />}
              </Field>
              <Field label="Type">
                {(control) => (
                  <Select {...control} value={fee.kind} onChange={(e) => setFee(fee.key, { kind: e.target.value as FeeRow["kind"] })}>
                    <option value="SHIPPING">Delivery</option>
                    <option value="FEE">Other fee</option>
                  </Select>
                )}
              </Field>
              <Field label="Amount" error={errors[`fees.${i}.amount`]} required>
                {(control) => (
                  <MoneyInput
                    {...control}
                    currency={currency}
                    value={fee.amount}
                    onChange={(e) => setFee(fee.key, { amount: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Free over" error={errors[`fees.${i}.waivedOver`]} hint="Blank = never.">
                {(control) => (
                  <MoneyInput
                    {...control}
                    currency={currency}
                    value={fee.waivedOver}
                    onChange={(e) => setFee(fee.key, { waivedOver: e.target.value })}
                  />
                )}
              </Field>
              <Button
                size="sm"
                variant="ghost"
                className="sm:mt-[26px]"
                onClick={() => setForm((f) => ({ ...f, fees: f.fees.filter((x) => x.key !== fee.key) }))}
                aria-label={`Remove fee ${i + 1}`}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setForm((f) => ({ ...f, fees: [...f.fees, emptyFee("FEE")] }))}>
            Add a fee
          </Button>
        </fieldset>

        <div className="space-y-2.5">
          <Checkbox
            label="Active"
            description="TrustRail blocks carts from inactive suppliers."
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          <Checkbox
            label="Accepts PayPal checkout"
            description="Orders are paid through PayPal (sandbox on this deployment) after an owner approves them."
            checked={form.checkoutEligible}
            onChange={(e) => set("checkoutEligible", e.target.checked)}
          />
        </div>

        <ErrorSummary key={attempt} messages={Object.values(errors)} />
        <ErrorNotice error={save.error} title="Supplier not saved" />
      </form>
    </Dialog>
  );
}
