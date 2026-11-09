import { and, desc, eq, gte } from "drizzle-orm";
import { floatToMinor, type MarketQuoteDto, type MarketReferenceDto } from "@qm/contracts";
import { marketQuotes, type DbOrTx } from "@qm/database";
import { Channel3Error, flattenOffers, type Channel3Client } from "@qm/integrations";
import { median, usableUnits, withoutOutliers } from "@qm/quartermaster";
import { detectPromptInjection } from "@qm/trustrail";
import type { Logger } from "../logger";
import type { InventoryRow } from "./inventory";

/**
 * Market research through Channel3. Results are reference evidence only and are never
 * purchasable through Quartermaster. A reference price is produced only when at least two
 * recent listings could be normalised to the item's usable unit with high confidence.
 */
export const MIN_COMPARABLE_SAMPLES = 2;

export type QuoteRow = typeof marketQuotes.$inferSelect;

export function toQuoteDto(q: QuoteRow): MarketQuoteDto {
  return {
    id: q.id,
    source: "CHANNEL3_MARKET",
    title: q.title,
    merchant_domain: q.merchantDomain,
    url: q.url,
    price_minor: q.priceMinor,
    currency: q.currency,
    pack_quantity: q.packQuantity,
    normalized_unit_price_minor: q.normalizedUnitPriceMinor,
    comparable: q.comparable,
    observed_at: q.observedAt.toISOString(),
    availability: q.availability,
  };
}

export function referenceFromQuotes(itemId: string, quotes: QuoteRow[], now: Date, maxAgeHours: number): MarketReferenceDto {
  const fresh = quotes.filter((q) => now.getTime() - q.observedAt.getTime() <= maxAgeHours * 3_600_000);
  const comparable = fresh.filter((q) => q.comparable && !q.suspicious && q.normalizedUnitPriceMinor !== null);
  const prices = withoutOutliers(comparable.map((q) => q.normalizedUnitPriceMinor!));
  const ref = prices.length >= MIN_COMPARABLE_SAMPLES ? median(prices) : null;
  const newest = fresh.reduce<Date | null>((acc, q) => (!acc || q.observedAt > acc ? q.observedAt : acc), null);
  return {
    inventory_item_id: itemId,
    reference_unit_price_minor: ref === null ? null : Math.round(ref * 10_000) / 10_000,
    sample_size: prices.length,
    observed_at: newest?.toISOString() ?? null,
    status: quotes.length > 0 && fresh.length === 0 ? "STALE" : ref === null ? "UNAVAILABLE" : "AVAILABLE",
    quotes: quotes.slice(0, 12).map(toQuoteDto),
  };
}

export interface MarketResearchResult {
  reference: MarketReferenceDto;
  suspicious: { quote: QuoteRow; signals: string[]; score: number }[];
  error: string | null;
}

export async function researchItem(
  db: DbOrTx,
  channel3: Channel3Client,
  args: { organizationId: string; requestId: string; item: InventoryRow; currency: string; now: Date; maxAgeHours: number; signal?: AbortSignal },
  log?: Pick<Logger, "warn">,
): Promise<MarketResearchResult> {
  if (!channel3.enabled) {
    return {
      reference: { inventory_item_id: args.item.id, reference_unit_price_minor: null, sample_size: 0, observed_at: null, status: "DISABLED", quotes: [] },
      suspicious: [],
      error: null,
    };
  }

  let error: string | null = null;
  const inserted: QuoteRow[] = [];
  const suspicious: MarketResearchResult["suspicious"] = [];
  // Only the Channel3 call is allowed to fail softly (the cached fallback below covers it); a
  // database error while storing quotes is a real failure and propagates.
  let offers: ReturnType<typeof flattenOffers> = [];
  try {
    const result = await channel3.search({ query: args.item.searchQuery, limit: 12, inStockOnly: true, signal: args.signal });
    offers = flattenOffers(result.products).slice(0, 24);
  } catch (err) {
    log?.warn({ err, inventory_item_id: args.item.id }, "Channel3 market search failed; using cached quotes");
    error = err instanceof Channel3Error ? err.message : "Market search failed";
  }
  for (const o of offers) {
    if (o.currency !== args.currency) continue;
    const parsed = usableUnits(args.item.unit, o.title, o.description);
    const units = parsed.units !== null && parsed.units > 0 ? parsed.units : null;
    const priceMinor = floatToMinor(o.price, o.currency);
    const comparable = units !== null && parsed.confidence === "HIGH" && priceMinor > 0;
    const verdict = detectPromptInjection(`${o.title}\n${o.description ?? ""}`);
    const [row] = await db
      .insert(marketQuotes)
      .values({
        organizationId: args.organizationId,
        requestId: args.requestId,
        inventoryItemId: args.item.id,
        source: "CHANNEL3_MARKET",
        externalProductId: o.product_id.slice(0, 200),
        title: o.title.slice(0, 500),
        merchantDomain: (o.domain ?? "").slice(0, 200),
        url: o.url.slice(0, 2000),
        priceMinor,
        currency: o.currency,
        packQuantity: units,
        normalizedUnitPriceMinor: comparable ? priceMinor / units! : null,
        comparable,
        availability: String(o.availability ?? "unknown").slice(0, 40),
        suspicious: verdict.suspicious,
        observedAt: args.now,
      })
      .returning();
    inserted.push(row!);
    if (verdict.suspicious) suspicious.push({ quote: row!, signals: verdict.signals.map((s) => s.rule), score: verdict.score });
  }

  // Fall back to recent cached quotes for this item when the live call failed or found nothing.
  let quotes = inserted;
  if (quotes.length === 0) {
    const since = new Date(args.now.getTime() - args.maxAgeHours * 3_600_000);
    quotes = await db
      .select()
      .from(marketQuotes)
      .where(and(eq(marketQuotes.organizationId, args.organizationId), eq(marketQuotes.inventoryItemId, args.item.id), gte(marketQuotes.observedAt, since)))
      .orderBy(desc(marketQuotes.observedAt))
      .limit(24);
  }
  const reference = referenceFromQuotes(args.item.id, quotes, args.now, args.maxAgeHours);
  if (error && reference.status !== "AVAILABLE") reference.status = "ERROR";
  return { reference, suspicious, error };
}
