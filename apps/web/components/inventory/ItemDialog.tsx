"use client";

import { PRODUCT_CATEGORIES, type InventoryItemDto, type ProductCategory, type SupplierDto } from "@qm/contracts";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, Input, Select } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { CATEGORY_LABELS } from "@/lib/labels";
import { emptyItemForm, formToCreateItem, formToUpdateItem, itemToForm, type ItemFormErrors, type ItemFormState } from "./item-form-state";

/**
 * Add a stock item, or edit an item's details (`item` given). Stock on hand is set only when the
 * item is created; after that it changes through adjustments and deliveries. Mount only while open.
 */
export function ItemDialog({
  item,
  suppliers,
  onClose,
  onSaved,
}: {
  item?: InventoryItemDto;
  suppliers: SupplierDto[];
  onClose: () => void;
  onSaved: (item: InventoryItemDto) => void;
}) {
  const [form, setForm] = useState<ItemFormState>(() => (item ? itemToForm(item) : emptyItemForm()));
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const formId = useId();
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const save = useAction(async (run: () => Promise<{ item: InventoryItemDto }>) => {
    onSaved((await run()).item);
    onClose();
  });
  const set = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (item) {
      const result = formToUpdateItem(form);
      if (!result.ok) return fail(result.errors);
      setErrors({});
      void save.run(() => api.inventory.update(item.id, result.value));
    } else {
      const result = formToCreateItem(form);
      if (!result.ok) return fail(result.errors);
      setErrors({});
      void save.run(() => api.inventory.create(result.value));
    }
  }

  function fail(next: ItemFormErrors) {
    setErrors(next);
    focusFirstError();
  }

  const numeric = (key: "onHand" | "safetyStock" | "coverageDays" | "leadTimeOverride") => ({
    inputMode: "numeric" as const,
    className: "tnum",
    value: form[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={item ? `Edit ${item.name}` : "Add a stock item"}
      description={item ? `SKU ${item.sku} · stock changes go through Adjust.` : "Track something the kitchen runs out of."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={save.pending}>
            {item ? "Save details" : "Add item"}
          </Button>
        </>
      }
    >
      <form ref={containerRef} id={formId} onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} required>
            {(control) => <Input {...control} value={form.name} onChange={(e) => set("name", e.target.value)} />}
          </Field>
          <Field label="SKU" error={errors.sku} hint="Your own code for the item." required>
            {(control) => <Input {...control} className="font-mono" value={form.sku} onChange={(e) => set("sku", e.target.value)} />}
          </Field>
          <Field label="Category" error={errors.category} required>
            {(control) => (
              <Select {...control} value={form.category} onChange={(e) => set("category", e.target.value as ProductCategory)}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Unit" error={errors.unit} hint="How you count it: each, kg, liter…" required>
            {(control) => <Input {...control} value={form.unit} onChange={(e) => set("unit", e.target.value)} />}
          </Field>
          {item ? null : (
            <Field label="On hand now" error={errors.onHand} required>
              {(control) => <Input {...control} {...numeric("onHand")} />}
            </Field>
          )}
          <Field label="Safety stock" error={errors.safetyStock} hint="Never plan to drop below this." required>
            {(control) => <Input {...control} {...numeric("safetyStock")} />}
          </Field>
          <Field label="Days of cover to order" error={errors.coverageDays} hint="How many days a reorder should last." required>
            {(control) => <Input {...control} {...numeric("coverageDays")} />}
          </Field>
          <Field label="Preferred supplier" error={errors.preferredSupplierId}>
            {(control) => (
              <Select {...control} value={form.preferredSupplierId} onChange={(e) => set("preferredSupplierId", e.target.value)}>
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Lead time override (days)" error={errors.leadTimeOverride} hint="Blank uses the preferred supplier's lead time.">
            {(control) => <Input {...control} {...numeric("leadTimeOverride")} />}
          </Field>
        </div>
        <Field
          label="Market search"
          error={errors.searchQuery}
          hint="What market research looks up for a price reference, e.g. “canola frying oil 35 lb jug”."
          required
        >
          {(control) => <Input {...control} value={form.searchQuery} onChange={(e) => set("searchQuery", e.target.value)} />}
        </Field>
        <Field label="Keywords" error={errors.keywords} hint="Comma-separated words people use for it in requests: oil, fryer oil.">
          {(control) => <Input {...control} value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />}
        </Field>
        <ErrorSummary key={attempt} messages={Object.values(errors)} />
        <ErrorNotice error={save.error} title="Item not saved" />
      </form>
    </Dialog>
  );
}
