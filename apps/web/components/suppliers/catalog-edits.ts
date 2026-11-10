/**
 * Saving a catalog grid edit: the listing's full details go back through
 * `PUT /suppliers/:id/catalog/:itemId` with the one changed field. Prices are minor units.
 */
import type { CatalogItemDto, CatalogItemInput } from "@qm/contracts";
import { api } from "@/lib/api";

export const EDITABLE_CATALOG_FIELDS = {
  unit_price_minor: "Price per pack",
  pack_quantity: "Units per pack",
  in_stock: "Availability",
} as const;

export type EditableCatalogField = keyof typeof EDITABLE_CATALOG_FIELDS;

export function catalogInput(item: CatalogItemDto): CatalogItemInput {
  return {
    sku: item.sku,
    title: item.title,
    description: item.description,
    category: item.category,
    inventory_item_id: item.inventory_item_id,
    pack_quantity: item.pack_quantity,
    unit_price_minor: item.unit_price_minor,
    in_stock: item.in_stock,
    recurring: item.recurring,
  };
}

export async function saveCatalogEdit(supplierId: string, before: CatalogItemDto, field: string, value: unknown): Promise<CatalogItemDto> {
  if (!(field in EDITABLE_CATALOG_FIELDS)) throw new Error("That column can't be edited.");
  if (before.quarantined) throw new Error("Quarantined listings can't be edited in the grid.");
  if (field === "in_stock" ? typeof value !== "boolean" : typeof value !== "number") throw new Error("That value isn't valid.");
  const { item } = await api.suppliers.updateCatalogItem(supplierId, before.id, { ...catalogInput(before), [field]: value });
  return item;
}

/** Price of one unit (the pack price spread over its units), in minor units. */
export function unitPriceMinor(item: Pick<CatalogItemDto, "unit_price_minor" | "pack_quantity">): number {
  return item.unit_price_minor / Math.max(1, item.pack_quantity);
}
