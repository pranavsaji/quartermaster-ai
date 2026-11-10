/** Catalog item form state ↔ `CatalogItemInput` (prices typed in dollars, sent as minor units). */
import { CatalogItemInput, type CatalogItemDto, type ProductCategory } from "@qm/contracts";
import { inputToMinor, minorToInput } from "@/lib/format";
import { checkNumber } from "@/lib/numbers";

export interface CatalogFormState {
  sku: string;
  title: string;
  description: string;
  category: ProductCategory;
  inventoryItemId: string;
  packQuantity: string;
  unitPrice: string;
  inStock: boolean;
  recurring: boolean;
}

export type CatalogFormErrors = Partial<Record<keyof CatalogFormState, string>>;

export function emptyCatalogForm(): CatalogFormState {
  return {
    sku: "",
    title: "",
    description: "",
    category: "food_packaging",
    inventoryItemId: "",
    packQuantity: "1",
    unitPrice: "",
    inStock: true,
    recurring: false,
  };
}

export function catalogItemToForm(item: CatalogItemDto): CatalogFormState {
  return {
    sku: item.sku,
    title: item.title,
    description: item.description,
    category: item.category,
    inventoryItemId: item.inventory_item_id ?? "",
    packQuantity: String(item.pack_quantity),
    unitPrice: minorToInput(item.unit_price_minor, item.currency),
    inStock: item.in_stock,
    recurring: item.recurring,
  };
}

export type CatalogFormResult = { ok: true; value: CatalogItemInput } | { ok: false; errors: CatalogFormErrors };

const FIELD: Record<string, keyof CatalogFormState> = {
  sku: "sku",
  title: "title",
  description: "description",
  category: "category",
  inventory_item_id: "inventoryItemId",
  pack_quantity: "packQuantity",
  unit_price_minor: "unitPrice",
};

export function formToCatalogInput(form: CatalogFormState, currency: string): CatalogFormResult {
  const errors: CatalogFormErrors = {};
  const pack = checkNumber(form.packQuantity, { integer: true, min: 1, max: 1_000_000 });
  if (!pack.ok) errors.packQuantity = pack.error;
  const price = inputToMinor(form.unitPrice, currency);
  if (price === null || price <= 0) errors.unitPrice = "Enter the price per pack, like 54.00.";
  const parsed = CatalogItemInput.safeParse({
    sku: form.sku,
    title: form.title,
    description: form.description,
    category: form.category,
    inventory_item_id: form.inventoryItemId || null,
    pack_quantity: pack.ok ? pack.value : 1,
    unit_price_minor: price ?? 1,
    in_stock: form.inStock,
    recurring: form.recurring,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = FIELD[String(issue.path[0])];
      if (!field || errors[field]) continue;
      errors[field] =
        field === "sku"
          ? "Enter a SKU using letters, numbers, dashes, dots or slashes."
          : field === "title"
            ? "Enter a title (at least 2 characters)."
            : issue.message;
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, value: parsed.data };
}
