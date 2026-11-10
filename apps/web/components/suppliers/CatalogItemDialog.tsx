"use client";

import { PRODUCT_CATEGORIES, type CatalogItemDto, type CatalogItemInput, type InventoryItemDto, type ProductCategory } from "@qm/contracts";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Checkbox, Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { CATEGORY_LABELS } from "@/lib/labels";
import {
  catalogItemToForm,
  emptyCatalogForm,
  formToCatalogInput,
  type CatalogFormErrors,
  type CatalogFormState,
} from "./catalog-form-state";

/** Add a product to a supplier's catalog, or edit one (`item` given). Mount only while open. */
export function CatalogItemDialog({
  supplierId,
  supplierName,
  item,
  currency,
  inventory,
  onClose,
  onSaved,
}: {
  supplierId: string;
  supplierName: string;
  item?: CatalogItemDto;
  currency: string;
  /** Stock items a listing can restock; empty while they load. */
  inventory: InventoryItemDto[];
  onClose: () => void;
  onSaved: (item: CatalogItemDto) => void;
}) {
  const [form, setForm] = useState<CatalogFormState>(() => (item ? catalogItemToForm(item) : emptyCatalogForm()));
  const [errors, setErrors] = useState<CatalogFormErrors>({});
  const formId = useId();
  const { containerRef, focusFirstError, attempt } = useErrorFocus<HTMLFormElement>();
  const save = useAction(async (body: CatalogItemInput) => {
    const result = item
      ? await api.suppliers.updateCatalogItem(supplierId, item.id, body)
      : await api.suppliers.addCatalogItem(supplierId, body);
    onSaved(result.item);
    onClose();
  });
  const set = <K extends keyof CatalogFormState>(key: K, value: CatalogFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = formToCatalogInput(form, currency);
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
      title={item ? `Edit ${item.sku}` : `Add a product to ${supplierName}`}
      description="Prices are per pack. Link the product to a stock item so the agent can use it to restock."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={save.pending}>
            {item ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <form ref={containerRef} id={formId} onSubmit={submit} noValidate className="space-y-4">
        {item?.quarantined ? (
          <Notice tone="block" title="Quarantined listing">
            Prompt-injection screening flagged this listing{item.quarantine_reason ? ` (${item.quarantine_reason})` : ""}. Its text is
            withheld from the agent and TrustRail blocks any cart that contains it. Editing it does not lift the quarantine.
          </Notice>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" error={errors.sku} hint="The supplier's product code." required>
            {(control) => <Input {...control} className="font-mono" value={form.sku} onChange={(e) => set("sku", e.target.value)} />}
          </Field>
          <Field label="Title" error={errors.title} required>
            {(control) => <Input {...control} value={form.title} onChange={(e) => set("title", e.target.value)} />}
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
          <Field label="Restocks" error={errors.inventoryItemId} hint="Which stock item this product replenishes.">
            {(control) => (
              <Select {...control} value={form.inventoryItemId} onChange={(e) => set("inventoryItemId", e.target.value)}>
                <option value="">Not linked</option>
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.sku})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Units per pack" error={errors.packQuantity} hint="In the stock item's unit, e.g. 250 containers." required>
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                className="tnum"
                value={form.packQuantity}
                onChange={(e) => set("packQuantity", e.target.value)}
              />
            )}
          </Field>
          <Field label="Price per pack" error={errors.unitPrice} required>
            {(control) => (
              <MoneyInput {...control} currency={currency} value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} />
            )}
          </Field>
        </div>
        <Field label="Description" error={errors.description} hint="Screened for instructions aimed at AI agents before the agent sees it.">
          {(control) => (
            <Textarea
              {...control}
              className="min-h-20"
              maxLength={2000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </Field>
        <div className="space-y-2.5">
          <Checkbox label="In stock" checked={form.inStock} onChange={(e) => set("inStock", e.target.checked)} />
          <Checkbox
            label="Recurring (subscription)"
            description="TrustRail refuses subscriptions unless the spend mandate allows them."
            checked={form.recurring}
            onChange={(e) => set("recurring", e.target.checked)}
          />
        </div>
        <ErrorSummary key={attempt} messages={Object.values(errors)} />
        <ErrorNotice error={save.error} title="Product not saved" />
      </form>
    </Dialog>
  );
}
