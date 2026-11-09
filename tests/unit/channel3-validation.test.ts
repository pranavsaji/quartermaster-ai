import { describe, expect, it } from "vitest";
import { Channel3Client, Channel3Error, flattenOffers, isHttpUrl, normaliseDomain } from "@qm/integrations";

const respond = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const offer = (over: Record<string, unknown> = {}) => ({ url: "https://shop.example/p", domain: "shop.example", price: { price: 10, currency: "USD" }, availability: "InStock", ...over });

function client(fetchImpl: typeof fetch) {
  const logs: { event: string; data: Record<string, unknown> }[] = [];
  return { c: new Channel3Client({ apiKey: "k", fetch: fetchImpl, log: (event, data) => logs.push({ event, data }) }), logs };
}

describe("Channel3 result validation", () => {
  it("keeps only offers with http(s) URLs and real domain names", async () => {
    const { c, logs } = client(
      respond({
        products: [
          {
            id: "p1",
            title: "Containers",
            offers: [
              offer(),
              offer({ url: "javascript:alert(1)" }),
              offer({ url: "data:text/html,<script>x</script>" }),
              offer({ url: "/relative/path" }),
              offer({ url: "https://user:pass@shop.example/p" }),
              offer({ domain: "evil.example/path?x" }),
              offer({ domain: "javascript:alert(1)" }),
              offer({ domain: "Shop.Example." }),
            ],
          },
        ],
      }),
    );
    const r = await c.search({ query: "containers" });
    expect(r.products[0]!.offers.map((o) => [o.url, o.domain])).toEqual([
      ["https://shop.example/p", "shop.example"],
      ["https://shop.example/p", "shop.example"],
    ]);
    expect(logs).toEqual([{ event: "channel3.items_dropped", data: { dropped_products: 0, dropped_offers: 6, kept_products: 1 } }]);
  });

  it("drops malformed products and offers instead of failing the search", async () => {
    const { c } = client(
      respond({
        products: [
          { id: "ok", title: "Oil", description: null, offers: [offer({ price: { price: 49, currency: "usd" } })] },
          { id: 5, title: "bad id", offers: [] },
          { id: "no-title", offers: [offer()] },
          "not an object",
          { id: "bad-offers", title: "Gloves", offers: [offer({ price: { price: "10", currency: "USD" } }), offer({ price: { price: -1, currency: "USD" } }), null] },
          { id: "imgs", title: "Lids", images: [{ url: "https://cdn.example/i.png" }, { url: "javascript:x" }], brands: "nope", offers: [offer()] },
        ],
      }),
    );
    const r = await c.search({ query: "x" });
    expect(r.products.map((p) => p.id)).toEqual(["ok", "bad-offers", "imgs"]);
    expect(r.products[1]!.offers).toEqual([]);
    expect(r.products[2]!.images).toEqual([{ url: "https://cdn.example/i.png" }]);
    expect(r.products[2]!.brands).toBeUndefined();
    expect(flattenOffers(r.products).map((o) => [o.product_id, o.currency])).toEqual([
      ["ok", "USD"],
      ["imgs", "USD"],
    ]);
  });

  it("fails clearly on a response that is not a product list", async () => {
    const { c } = client(respond({ products: "lots" }));
    await expect(c.search({ query: "x" })).rejects.toBeInstanceOf(Channel3Error);
  });

  it("aborts with the caller's signal", async () => {
    const hang: typeof fetch = (_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const { c } = client(hang);
    const controller = new AbortController();
    const pending = c.search({ query: "x", signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow(/aborted/);
  });

  it("validates URLs and domains", () => {
    expect(isHttpUrl("http://a.example/x")).toBe(true);
    expect(isHttpUrl("ftp://a.example/x")).toBe(false);
    expect(isHttpUrl("not a url")).toBe(false);
    expect(normaliseDomain("WWW.Shop.Example")).toBe("www.shop.example");
    expect(normaliseDomain("shop.example:8080")).toBeNull();
    expect(normaliseDomain("localhost")).toBeNull();
    expect(normaliseDomain("-bad.example")).toBeNull();
  });
});
