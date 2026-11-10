/** Stock item form state ↔ `CreateInventoryItemRequest` / `InventoryItemInput`. */
import { CreateInventoryItemRequest, InventoryItemInput, type InventoryItemDto, type ProductCategory } from "@qm/contracts";
import { checkNumber } from "@/lib/numbers";

export interface ItemFormState {
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  /** Only when creating: later changes go through stock adjustments. */
  onHand: string;
  safetyStock: string;
  coverageDays: string;
  /** Blank = use the preferred supplier's lead time. */
  leadTimeOverride: string;
  preferredSupplierId: string;
  searchQuery: string;
  /** Comma-separated. */
  keywords: string;
}

export type ItemFormErrors = Partial<Record<keyof ItemFormState, string>>;

export function emptyItemForm(): ItemFormState {
  return {
    sku: "",
    name: "",
    category: "food_packaging",
    unit: "each",
    onHand: "0",
    safetyStock: "0",
    coverageDays: "3",
    leadTimeOverride: "",
    preferredSupplierId: "",
    searchQuery: "",
    keywords: "",
  };
}

export function itemToForm(item: InventoryItemDto): ItemFormState {
  return {
    sku: item.sku,
    name: item.name,
    category: item.category,
    unit: item.unit,
    onHand: String(item.on_hand),
    safetyStock: String(item.safety_stock),
    coverageDays: String(item.coverage_days),
    leadTimeOverride: item.lead_time_days_override == null ? "" : String(item.lead_time_days_override),
    preferredSupplierId: item.preferred_supplier_id ?? "",
    searchQuery: item.search_query,
    keywords: item.keywords.join(", "),
  };
}

/** "oil, Fryer oil ,, canola" → ["oil", "fryer oil", "canola"] (trimmed, lower-cased, de-duplicated). */
export function parseKeywords(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

const MESSAGES: Partial<Record<keyof ItemFormState, string>> = {
  sku: "Enter a SKU using letters, numbers, dashes, dots or slashes.",
  name: "Enter a name.",
  unit: "Enter a unit, like each, kg or liter.",
  searchQuery: "Describe the product for market research (at least 2 characters).",
  keywords: "Use up to 20 keywords of at most 40 characters each.",
};

const FIELD: Record<string, keyof ItemFormState> = {
  sku: "sku",
  name: "name",
  category: "category",
  unit: "unit",
  on_hand: "onHand",
  safety_stock: "safetyStock",
  coverage_days: "coverageDays",
  lead_time_days_override: "leadTimeOverride",
  preferred_supplier_id: "preferredSupplierId",
  search_query: "searchQuery",
  keywords: "keywords",
};

type Result<T> = { ok: true; value: T } | { ok: false; errors: ItemFormErrors };

function common(form: ItemFormState, errors: ItemFormErrors) {
  const safety = checkNumber(form.safetyStock, { integer: true, min: 0, max: 10_000_000 });
  if (!safety.ok) errors.safetyStock = safety.error;
  const coverage = checkNumber(form.coverageDays, { integer: true, min: 1, max: 60 });
  if (!coverage.ok) errors.coverageDays = coverage.error;
  let lead: number | null = null;
  if (form.leadTimeOverride.trim() !== "") {
    const checked = checkNumber(form.leadTimeOverride, { integer: true, min: 0, max: 60 });
    if (checked.ok) lead = checked.value;
    else errors.leadTimeOverride = checked.error;
  }
  return {
    sku: form.sku,
    name: form.name,
    category: form.category,
    unit: form.unit,
    safety_stock: safety.ok ? safety.value : 0,
    coverage_days: coverage.ok ? coverage.value : 1,
    lead_time_days_override: lead,
    preferred_supplier_id: form.preferredSupplierId || null,
    search_query: form.searchQuery,
    keywords: parseKeywords(form.keywords),
  };
}

function collect(issues: { path: PropertyKey[]; message: string }[], errors: ItemFormErrors) {
  for (const issue of issues) {
    const field = FIELD[String(issue.path[0])];
    if (field && !errors[field]) errors[field] = MESSAGES[field] ?? issue.message;
  }
}

export function formToCreateItem(form: ItemFormState): Result<CreateInventoryItemRequest> {
  const errors: ItemFormErrors = {};
  const body = common(form, errors);
  const onHand = checkNumber(form.onHand, { integer: true, min: 0, max: 10_000_000 });
  if (!onHand.ok) errors.onHand = onHand.error;
  const parsed = CreateInventoryItemRequest.safeParse({ ...body, on_hand: onHand.ok ? onHand.value : 0 });
  if (!parsed.success) collect(parsed.error.issues, errors);
  if (Object.keys(errors).length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, value: parsed.data };
}

export function formToUpdateItem(form: ItemFormState): Result<InventoryItemInput> {
  const errors: ItemFormErrors = {};
  const parsed = InventoryItemInput.safeParse(common(form, errors));
  if (!parsed.success) collect(parsed.error.issues, errors);
  if (Object.keys(errors).length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, value: parsed.data };
}
