/**
 * Saving a stock grid edit. Thresholds go through `PUT /inventory/:id` with the item's full details;
 * an on-hand edit is a stock count, recorded as a COUNT_CORRECTION adjustment guarded by the
 * quantity the person saw, so it never overwrites a delivery or adjustment made in the meantime
 * (the API answers 409 STOCK_CHANGED instead).
 */
import type { InventoryItemDto, InventoryItemInput } from "@qm/contracts";
import { api } from "@/lib/api";

export const EDITABLE_INVENTORY_FIELDS = {
  on_hand: { label: "On hand", min: 0, max: 10_000_000 },
  safety_stock: { label: "Safety stock", min: 0, max: 10_000_000 },
  coverage_days: { label: "Cover target (days)", min: 1, max: 60 },
} as const;

export type EditableInventoryField = keyof typeof EDITABLE_INVENTORY_FIELDS;

export function isEditableInventoryField(field: string): field is EditableInventoryField {
  return field in EDITABLE_INVENTORY_FIELDS;
}

/** The item's editable details as the API takes them. */
export function inventoryInput(item: InventoryItemDto): InventoryItemInput {
  return {
    sku: item.sku,
    name: item.name,
    category: item.category,
    unit: item.unit,
    safety_stock: item.safety_stock,
    coverage_days: item.coverage_days,
    lead_time_days_override: item.lead_time_days_override,
    preferred_supplier_id: item.preferred_supplier_id,
    search_query: item.search_query,
    keywords: item.keywords,
  };
}

export async function saveInventoryEdit(before: InventoryItemDto, field: string, value: unknown): Promise<InventoryItemDto> {
  if (!isEditableInventoryField(field) || typeof value !== "number") throw new Error("That column can't be edited.");
  if (field === "on_hand") {
    const { item } = await api.inventory.adjust(before.id, {
      quantity_delta: value - before.on_hand,
      reason: "COUNT_CORRECTION",
      note: "Counted in the stock grid",
      expected_on_hand: before.on_hand,
    });
    return item;
  }
  const { item } = await api.inventory.update(before.id, { ...inventoryInput(before), [field]: value });
  return item;
}
