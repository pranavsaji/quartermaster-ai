import { and, eq, inArray } from "drizzle-orm";
import type { DataSource, ProductCategory, SupplierDto } from "@qm/contracts";
import { supplierCatalogItems, suppliers, type DbOrTx } from "@qm/database";
import type { CatalogOffer, StorefrontQuoteLine, SupplierProfile } from "@qm/quartermaster";
import type { SpendMandate } from "@qm/trustrail";

export type SupplierRow = typeof suppliers.$inferSelect;
export type CatalogRow = typeof supplierCatalogItems.$inferSelect;

export function toSupplierProfile(s: SupplierRow, mandate: SpendMandate | null): SupplierProfile {
  return {
    id: s.id,
    name: s.name,
    approved: Boolean(mandate?.approved_supplier_ids.includes(s.id)),
    active: s.active,
    checkout_eligible: s.checkoutEligible,
    lead_time_days: s.leadTimeDays,
    tax_rate_bps: s.taxRateBps,
    fee_terms: s.feeTerms,
  };
}

export function storefrontLines(s: SupplierRow): StorefrontQuoteLine[] {
  return s.storefrontQuoteLines.map((l) => ({ ...l }));
}

export function toOffer(c: CatalogRow): CatalogOffer {
  return {
    id: c.id,
    supplier_id: c.supplierId,
    sku: c.sku,
    title: c.title,
    description: c.description,
    category: c.category as ProductCategory,
    inventory_item_id: c.inventoryItemId,
    pack_quantity: c.packQuantity,
    unit_price_minor: c.unitPriceMinor,
    currency: c.currency,
    in_stock: c.inStock,
    recurring: c.recurring,
  };
}

export async function loadSuppliers(db: DbOrTx, organizationId: string): Promise<SupplierRow[]> {
  return db.select().from(suppliers).where(eq(suppliers.organizationId, organizationId)).orderBy(suppliers.name);
}

export async function loadCatalogForItems(db: DbOrTx, organizationId: string, itemIds: string[]): Promise<CatalogRow[]> {
  if (itemIds.length === 0) return [];
  return db
    .select()
    .from(supplierCatalogItems)
    .where(and(eq(supplierCatalogItems.organizationId, organizationId), inArray(supplierCatalogItems.inventoryItemId, itemIds)));
}

export async function loadCatalogForSupplier(db: DbOrTx, organizationId: string, supplierId: string): Promise<CatalogRow[]> {
  return db
    .select()
    .from(supplierCatalogItems)
    .where(and(eq(supplierCatalogItems.organizationId, organizationId), eq(supplierCatalogItems.supplierId, supplierId)));
}

export function toSupplierDto(s: SupplierRow, mandate: SpendMandate | null): SupplierDto {
  return {
    id: s.id,
    name: s.name,
    approved: Boolean(mandate?.approved_supplier_ids.includes(s.id)),
    active: s.active,
    checkout_eligible: s.checkoutEligible,
    lead_time_days: s.leadTimeDays,
    tax_rate_bps: s.taxRateBps,
    fee_terms: s.feeTerms,
    website: s.website,
    data_source: s.dataSource as DataSource,
  };
}
