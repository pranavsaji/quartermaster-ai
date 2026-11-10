import { z } from "zod";
import { CircuitBreaker, isProviderFailureStatus } from "../circuit-breaker";
import { redactSecrets } from "../redact";

/**
 * Channel3 product search client (https://channel3.ai/docs). Used for market price evidence only:
 * Quartermaster never checks out with a Channel3 merchant. Results are untrusted third-party data:
 * every product and offer is validated here and malformed ones are dropped (and counted in a
 * log), so one bad listing never fails the whole search.
 */

export interface Channel3Config {
  apiKey: string | null;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Structured logger. Receives counts only, never listing content. */
  log?: (event: string, data: Record<string, unknown>) => void;
  /**
   * Consecutive provider failures (network, timeout, 429, 5xx) before searches are skipped for
   * `breakerCooldownMs` (research then uses cached listings at once). 0 disables it.
   */
  breakerThreshold?: number;
  breakerCooldownMs?: number;
  /** Clock for the breaker (tests). */
  now?: () => number;
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
  availability: "InStock" | "OutOfStock" | (string & {});
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
  /** Aborts the search early (e.g. the agent run's deadline), on top of the client timeout. */
  signal?: AbortSignal;
}

/**
 * `message` is for logs only: it may carry a short, redacted provider reason. Client-facing text
 * must be derived from `status`, never from `message`.
 */
export class Channel3Error extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    /** True when the search was skipped because the circuit breaker is open (nothing was sent). */
    readonly circuitOpen = false,
  ) {
    super(message);
    this.name = "Channel3Error";
  }
}

export class Channel3Client {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;

  constructor(private readonly config: Channel3Config) {
    this.baseUrl = config.baseUrl ?? "https://api.trychannel3.com";
    this.fetchImpl = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.breaker = new CircuitBreaker({
      threshold: config.breakerThreshold ?? 3,
      cooldownMs: config.breakerCooldownMs ?? 120_000,
      now: config.now,
      onChange: (state, failures) => config.log?.(state === "open" ? "channel3.circuit_open" : "channel3.circuit_closed", { failures }),
    });
  }

  /** `closed` (searches go through), `open` (searches are skipped) or `half_open` (one trial allowed). */
  get circuitState() {
    return this.breaker.state;
  }

  async search(params: Channel3SearchParams): Promise<Channel3SearchResponse> {
    if (!this.config.apiKey) throw new Channel3Error("Channel3 is not configured (CHANNEL3_API_KEY).", null);
    if (params.signal?.aborted) throw new Channel3Error("Channel3 request aborted", null);
    if (!this.breaker.allow()) throw new Channel3Error("Channel3 skipped: circuit open after repeated provider failures", null, true);
    try {
      const result = await this.searchOnce(params);
      this.breaker.success();
      return result;
    } catch (err) {
      if (params.signal?.aborted) this.breaker.neutral();
      else if (err instanceof Channel3Error && isProviderFailureStatus(err.status)) this.breaker.failure();
      // A 4xx or a malformed body: Channel3 answered, so it is reachable.
      else this.breaker.success();
      throw err;
    }
  }

  get enabled(): boolean {
    return Boolean(this.config.apiKey);
  }

  private async searchOnce(params: Channel3SearchParams): Promise<Channel3SearchResponse> {
    const apiKey = this.config.apiKey!;
    const filters: Record<string, unknown> = {};
    if (params.inStockOnly !== false) filters.availability = ["InStock"];
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      filters.price = {
        ...(params.minPrice !== undefined ? { min_price: params.minPrice } : {}),
        ...(params.maxPrice !== undefined ? { max_price: params.maxPrice } : {}),
      };
    }
    const timeout = AbortSignal.timeout(this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/search`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: params.query.slice(0, 200), limit: Math.min(Math.max(params.limit ?? 10, 1), 30), filters }),
        signal: params.signal ? AbortSignal.any([timeout, params.signal]) : timeout,
      });
      if (!res.ok) {
        // The body is third-party text: keep only a short, redacted reason for the logs.
        const reason = redactSecrets(await res.text().catch(() => ""), 120);
        throw new Channel3Error(`Channel3 search failed (HTTP ${res.status})${reason ? `: ${reason}` : ""}`, res.status);
      }
      const envelope = SearchEnvelope.safeParse(await res.json().catch(() => null));
      if (!envelope.success) throw new Channel3Error("Channel3 returned an unexpected response", res.status);
      const { products, droppedProducts, droppedOffers } = parseProducts(envelope.data.products ?? []);
      if (droppedProducts || droppedOffers) {
        this.config.log?.("channel3.items_dropped", {
          dropped_products: droppedProducts,
          dropped_offers: droppedOffers,
          kept_products: products.length,
        });
      }
      return { products, next_page_token: envelope.data.next_page_token ?? null };
    } catch (err) {
      if (err instanceof Channel3Error) throw err;
      if (params.signal?.aborted) throw new Channel3Error("Channel3 request aborted", null);
      throw new Channel3Error(`Channel3 request failed: ${redactSecrets(err instanceof Error ? err.message : String(err), 120)}`, null);
    }
  }
}

/* ---------------------------------------------------------------- Validation */

/** Absolute http(s) URL only: `javascript:`, `data:`, relative, credentialed and malformed URLs are rejected. */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;

/** A bare DNS name (no scheme, port, path or credentials), lower-cased; null if it is not one. */
export function normaliseDomain(value: string): string | null {
  const d = value.trim().toLowerCase().replace(/\.$/, "");
  return HOSTNAME.test(d) ? d : null;
}

const clipped = (max: number) => z.string().transform((v) => v.slice(0, max));
const HttpUrl = z.string().max(2000).refine(isHttpUrl, "not an http(s) URL");
const Domain = z.string().transform((v, c) => {
  const d = normaliseDomain(v);
  if (d === null) c.addIssue({ code: "custom", message: "not a domain name" });
  return d ?? "";
});

const OfferSchema = z.object({
  url: HttpUrl,
  domain: Domain,
  price: z.object({
    price: z.number().finite().positive(),
    compare_at_price: z.number().finite().nullish(),
    currency: z.string().regex(/^[A-Za-z]{3}$/),
  }),
  availability: clipped(40),
  condition: z.enum(["new", "used"]).nullish().catch(null),
});

const ImageSchema = z.object({ url: HttpUrl, is_main_image: z.boolean().optional() });

const ProductSchema = z.object({
  id: z.string().min(1).max(200),
  title: clipped(500).pipe(z.string().min(1)),
  description: clipped(5000).nullish(),
  brands: z
    .array(z.object({ id: z.string(), name: clipped(200) }))
    .optional()
    .catch(undefined),
  // Images are optional decoration: keep the valid http(s) ones, drop the rest.
  images: z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((images) =>
      images?.flatMap((i) => {
        const r = ImageSchema.safeParse(i);
        return r.success ? [r.data] : [];
      }),
    ),
  offers: z.array(z.unknown()).max(200),
});

const SearchEnvelope = z.object({
  products: z.array(z.unknown()).max(500).nullish(),
  next_page_token: z.string().max(2000).nullish(),
});

function parseProducts(raw: unknown[]): { products: Channel3Product[]; droppedProducts: number; droppedOffers: number } {
  let droppedProducts = 0;
  let droppedOffers = 0;
  const products: Channel3Product[] = [];
  for (const item of raw) {
    const p = ProductSchema.safeParse(item);
    if (!p.success) {
      droppedProducts++;
      continue;
    }
    const offers: Channel3Offer[] = [];
    for (const o of p.data.offers) {
      const offer = OfferSchema.safeParse(o);
      if (offer.success) offers.push(offer.data);
      else droppedOffers++;
    }
    products.push({ ...p.data, offers });
  }
  return { products, droppedProducts, droppedOffers };
}

/** Flattens products into one row per offer with a valid numeric price. */
export function flattenOffers(products: Channel3Product[]) {
  return products.flatMap((p) =>
    p.offers
      .filter(
        (o) =>
          o &&
          typeof o.url === "string" &&
          o.price &&
          Number.isFinite(o.price.price) &&
          o.price.price > 0 &&
          typeof o.price.currency === "string",
      )
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
