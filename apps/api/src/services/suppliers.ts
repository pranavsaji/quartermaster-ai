import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type {
  CatalogItemDto,
  CatalogItemInput,
  DataSource,
  ProductCategory,
  SupplierDetailDto,
  SupplierDto,
  SupplierInput,
} from "@qm/contracts";
import { inventoryItems, organizations, supplierCatalogItems, suppliers, type DbOrTx } from "@qm/database";
import type { CatalogOffer, StorefrontQuoteLine, SupplierProfile } from "@qm/quartermaster";
import { detectPromptInjection, type SpendMandate } from "@qm/trustrail";
import { conflict, notFound } from "../errors";
import { appendAudit } from "./audit";
import { recordFinding } from "./findings";

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

export function toSupplierDto(s: SupplierRow, mandate: SpendMandate | null, catalogItems = 0): SupplierDto {
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
    description: s.description,
    quarantined: s.quarantined,
    catalog_items: catalogItems,
    data_source: s.dataSource as DataSource,
  };
}

export function toCatalogDto(c: CatalogRow): CatalogItemDto {
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
    quarantined: c.quarantined,
    quarantine_reason: c.quarantineReason,
    updated_at: c.updatedAt.toISOString(),
  };
}

/** Number of catalog listings per supplier in the organisation. */
export async function catalogCounts(db: DbOrTx, organizationId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ supplierId: supplierCatalogItems.supplierId, n: sql<number>`count(*)::int` })
    .from(supplierCatalogItems)
    .where(eq(supplierCatalogItems.organizationId, organizationId))
    .groupBy(supplierCatalogItems.supplierId);
  return new Map(rows.map((r) => [r.supplierId, r.n]));
}

async function loadSupplier(db: DbOrTx, organizationId: string, supplierId: string, lock = false): Promise<SupplierRow> {
  const q = db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, organizationId)));
  const [row] = lock ? await q.for("update") : await q;
  if (!row) throw notFound("Supplier");
  return row;
}

export async function supplierDetail(
  db: DbOrTx,
  organizationId: string,
  supplierId: string,
  mandate: SpendMandate | null,
): Promise<SupplierDetailDto> {
  const s = await loadSupplier(db, organizationId, supplierId);
  const catalog = (await loadCatalogForSupplier(db, organizationId, supplierId)).sort((a, b) => a.sku.localeCompare(b.sku));
  return { ...toSupplierDto(s, mandate, catalog.length), catalog: catalog.map(toCatalogDto), created_at: s.createdAt.toISOString() };
}

async function assertSupplierNameFree(tx: DbOrTx, organizationId: string, name: string, exceptId?: string): Promise<void> {
  const [clash] = await tx
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.organizationId, organizationId),
        sql`lower(${suppliers.name}) = ${name.toLowerCase()}`,
        ...(exceptId ? [ne(suppliers.id, exceptId)] : []),
      ),
    );
  if (clash) throw conflict("SUPPLIER_EXISTS", "A supplier with this name already exists.");
}

const supplierValues = (input: SupplierInput) => ({
  name: input.name,
  website: input.website,
  description: input.description,
  leadTimeDays: input.lead_time_days,
  taxRateBps: input.tax_rate_bps,
  feeTerms: input.fee_terms.map((f) => ({ ...f })),
  active: input.active,
  checkoutEligible: input.checkout_eligible,
});

/**
 * Adds a supplier entered by the team. It is not on the approved list: only an owner can approve
 * it, through the Spend Mandate, before TrustRail will allow paying it.
 */
export async function createSupplier(
  tx: DbOrTx,
  actor: { id: string; organizationId: string },
  input: SupplierInput,
): Promise<SupplierRow> {
  await assertSupplierNameFree(tx, actor.organizationId, input.name);
  const [row] = await tx
    .insert(suppliers)
    .values({ organizationId: actor.organizationId, ...supplierValues(input), dataSource: "USER_ENTERED" })
    .returning();
  await appendAudit(tx, {
    organizationId: actor.organizationId,
    action: "supplier.created",
    actorType: "USER",
    actorId: actor.id,
    entityType: "supplier",
    entityId: row!.id,
    data: { name: input.name, lead_time_days: input.lead_time_days, tax_rate_bps: input.tax_rate_bps, fee_terms: input.fee_terms.length },
  });
  return row!;
}

export async function updateSupplier(
  tx: DbOrTx,
  actor: { id: string; organizationId: string },
  supplierId: string,
  input: SupplierInput,
): Promise<SupplierRow> {
  const before = await loadSupplier(tx, actor.organizationId, supplierId, true);
  await assertSupplierNameFree(tx, actor.organizationId, input.name, supplierId);
  const [row] = await tx.update(suppliers).set(supplierValues(input)).where(eq(suppliers.id, supplierId)).returning();
  const changed = Object.entries({
    name: [before.name, input.name],
    active: [before.active, input.active],
    checkout_eligible: [before.checkoutEligible, input.checkout_eligible],
    lead_time_days: [before.leadTimeDays, input.lead_time_days],
    tax_rate_bps: [before.taxRateBps, input.tax_rate_bps],
    fee_terms: [JSON.stringify(before.feeTerms), JSON.stringify(input.fee_terms)],
    website: [before.website, input.website],
    description: [before.description, input.description],
  })
    .filter(([, [a, b]]) => a !== b)
    .map(([k]) => k);
  await appendAudit(tx, {
    organizationId: actor.organizationId,
    action: "supplier.updated",
    actorType: "USER",
    actorId: actor.id,
    entityType: "supplier",
    entityId: supplierId,
    data: { changed },
  });
  return row!;
}

async function assertInventoryItem(tx: DbOrTx, organizationId: string, itemId: string | null): Promise<void> {
  if (!itemId) return;
  const [item] = await tx
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)));
  if (!item) throw conflict("INVENTORY_ITEM_NOT_FOUND", "The linked stock item does not exist in this workspace.");
}

/**
 * Screens a listing's text when it is saved, with the same deterministic detector research uses.
 * Text aimed at AI agents quarantines the listing at once (withheld from the model, blocked by
 * TrustRail) and records a finding, instead of waiting for the next research run to notice.
 * Quarantine is sticky: editing the text does not lift it.
 */
async function screenListing(
  tx: DbOrTx,
  organizationId: string,
  actorId: string,
  row: CatalogRow,
  supplierName: string,
): Promise<CatalogRow> {
  const verdict = detectPromptInjection(`${row.title}\n${row.description}`);
  if (!verdict.suspicious) return row;
  let current = row;
  if (verdict.quarantine && !row.quarantined) {
    const [updated] = await tx
      .update(supplierCatalogItems)
      .set({ quarantined: true, quarantineReason: verdict.signals.map((s) => s.rule).join(",") })
      .where(eq(supplierCatalogItems.id, row.id))
      .returning();
    current = updated!;
  }
  await recordFinding(tx, {
    organizationId,
    type: "PROMPT_INJECTION",
    severity: verdict.severity,
    title: `Prompt injection in ${supplierName} listing ${row.sku}`,
    description: verdict.quarantine
      ? "The listing text contains instructions aimed at AI agents. It was quarantined when saved: the agent never sees its text and TrustRail blocks any cart containing it."
      : "The listing text contains suspicious phrasing. It is flagged for review.",
    sourceKind: "supplier_catalog_item",
    sourceId: row.id,
    evidence: { sku: row.sku, score: verdict.score, signals: verdict.signals },
  });
  await appendAudit(tx, {
    organizationId,
    action: verdict.quarantine ? "security.source_quarantined" : "security.source_flagged",
    actorType: "SYSTEM",
    entityType: "supplier_catalog_item",
    entityId: row.id,
    data: { sku: row.sku, score: verdict.score, rules: verdict.signals.map((s) => s.rule), saved_by: actorId },
  });
  return current;
}

async function assertSkuFree(tx: DbOrTx, supplierId: string, sku: string, exceptId?: string): Promise<void> {
  const [clash] = await tx
    .select({ id: supplierCatalogItems.id })
    .from(supplierCatalogItems)
    .where(
      and(
        eq(supplierCatalogItems.supplierId, supplierId),
        eq(supplierCatalogItems.sku, sku),
        ...(exceptId ? [ne(supplierCatalogItems.id, exceptId)] : []),
      ),
    );
  if (clash) throw conflict("CATALOG_SKU_EXISTS", "This supplier already has a listing with that SKU.");
}

const catalogValues = (input: CatalogItemInput) => ({
  sku: input.sku,
  title: input.title,
  description: input.description,
  category: input.category,
  inventoryItemId: input.inventory_item_id,
  packQuantity: input.pack_quantity,
  unitPriceMinor: input.unit_price_minor,
  inStock: input.in_stock,
  recurring: input.recurring,
});

export async function createCatalogItem(
  tx: DbOrTx,
  actor: { id: string; organizationId: string },
  supplierId: string,
  input: CatalogItemInput,
): Promise<CatalogRow> {
  const supplier = await loadSupplier(tx, actor.organizationId, supplierId, true);
  await assertSkuFree(tx, supplierId, input.sku);
  await assertInventoryItem(tx, actor.organizationId, input.inventory_item_id);
  const [org] = await tx.select({ currency: organizations.currency }).from(organizations).where(eq(organizations.id, actor.organizationId));
  const [row] = await tx
    .insert(supplierCatalogItems)
    .values({ organizationId: actor.organizationId, supplierId, ...catalogValues(input), currency: org!.currency })
    .returning();
  await appendAudit(tx, {
    organizationId: actor.organizationId,
    action: "catalog.created",
    actorType: "USER",
    actorId: actor.id,
    entityType: "supplier_catalog_item",
    entityId: row!.id,
    data: { supplier_id: supplierId, sku: input.sku, unit_price_minor: input.unit_price_minor, pack_quantity: input.pack_quantity },
  });
  return screenListing(tx, actor.organizationId, actor.id, row!, supplier.name);
}

export async function updateCatalogItem(
  tx: DbOrTx,
  actor: { id: string; organizationId: string },
  supplierId: string,
  itemId: string,
  input: CatalogItemInput,
  now: Date,
): Promise<CatalogRow> {
  const supplier = await loadSupplier(tx, actor.organizationId, supplierId);
  const [before] = await tx
    .select()
    .from(supplierCatalogItems)
    .where(
      and(
        eq(supplierCatalogItems.id, itemId),
        eq(supplierCatalogItems.supplierId, supplierId),
        eq(supplierCatalogItems.organizationId, actor.organizationId),
      ),
    )
    .for("update");
  if (!before) throw notFound("Catalog item");
  await assertSkuFree(tx, supplierId, input.sku, itemId);
  await assertInventoryItem(tx, actor.organizationId, input.inventory_item_id);
  const [row] = await tx
    .update(supplierCatalogItems)
    .set({ ...catalogValues(input), updatedAt: now })
    .where(eq(supplierCatalogItems.id, itemId))
    .returning();
  await appendAudit(tx, {
    organizationId: actor.organizationId,
    action: "catalog.updated",
    actorType: "USER",
    actorId: actor.id,
    entityType: "supplier_catalog_item",
    entityId: itemId,
    data: {
      supplier_id: supplierId,
      sku: input.sku,
      unit_price_minor: { from: before.unitPriceMinor, to: input.unit_price_minor },
      in_stock: input.in_stock,
    },
  });
  const textChanged = before.title !== input.title || before.description !== input.description;
  return textChanged ? screenListing(tx, actor.organizationId, actor.id, row!, supplier.name) : row!;
}
