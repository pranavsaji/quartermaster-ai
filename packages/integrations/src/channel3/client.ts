/**
 * Channel3 product search client (https://channel3.ai/docs). Used for market price evidence only:
 * Quartermaster never checks out with a Channel3 merchant. Results are untrusted third-party data.
 */

export interface Channel3Config {
  apiKey: string | null;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface Channel3Price {
  price: number;
  compare_at_price?: number | null;
  currency: string;
}

export interface Channel3Offer {
  url: string;
  domain: string;
  price: Channel3Price;
  availability: "InStock" | "OutOfStock" | string;
  condition?: "new" | "used" | null;
}

export interface Channel3Product {
  id: string;
  title: string;
  description?: string | null;
  brands?: { id: string; name: string }[];
  images?: { url: string; is_main_image?: boolean }[];
  offers: Channel3Offer[];
}

export interface Channel3SearchResponse {
  products: Channel3Product[];
  next_page_token?: string | null;
}

export interface Channel3SearchParams {
  query: string;
  limit?: number;
  maxPrice?: number;
  minPrice?: number;
  inStockOnly?: boolean;
}

export class Channel3Error extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "Channel3Error";
  }
}

export class Channel3Client {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: Channel3Config) {
    this.baseUrl = config.baseUrl ?? "https://api.trychannel3.com";
    this.fetchImpl = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  get enabled(): boolean {
    return !!this.config.apiKey;
  }

  async search(params: Channel3SearchParams): Promise<Channel3SearchResponse> {
    if (!this.config.apiKey) throw new Channel3Error("Channel3 is not configured (CHANNEL3_API_KEY).", null);
    const filters: Record<string, unknown> = {};
    if (params.inStockOnly !== false) filters.availability = ["InStock"];
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      filters.price = { ...(params.minPrice !== undefined ? { min_price: params.minPrice } : {}), ...(params.maxPrice !== undefined ? { max_price: params.maxPrice } : {}) };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/search`, {
        method: "POST",
        headers: { "x-api-key": this.config.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: params.query.slice(0, 200), limit: Math.min(Math.max(params.limit ?? 10, 1), 30), filters }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Channel3Error(`Channel3 search failed (${res.status}): ${text.slice(0, 200)}`, res.status);
      }
      const json = (await res.json()) as Partial<Channel3SearchResponse>;
      return { products: Array.isArray(json.products) ? json.products.filter(isProduct) : [], next_page_token: json.next_page_token ?? null };
    } catch (err) {
      if (err instanceof Channel3Error) throw err;
      throw new Channel3Error(`Channel3 request failed: ${err instanceof Error ? err.message : String(err)}`, null);
    } finally {
      clearTimeout(timer);
    }
  }
}

function isProduct(p: unknown): p is Channel3Product {
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  return typeof x.id === "string" && typeof x.title === "string" && Array.isArray(x.offers);
}

/** Flattens products into one row per offer with a valid numeric price. */
export function flattenOffers(products: Channel3Product[]) {
  return products.flatMap((p) =>
    p.offers
      .filter((o) => o && typeof o.url === "string" && o.price && Number.isFinite(o.price.price) && o.price.price > 0 && typeof o.price.currency === "string")
      .map((o) => ({
        product_id: p.id,
        title: p.title,
        description: p.description ?? null,
        url: o.url,
        domain: o.domain,
        price: o.price.price,
        currency: o.price.currency.toUpperCase(),
        availability: o.availability,
      })),
  );
}
