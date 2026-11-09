import { describe, expect, it } from "vitest";
import { buildCart } from "@qm/trustrail";
import {
  PayPalAmbiguousError,
  PayPalApiError,
  PayPalClient,
  PayPalNotConfiguredError,
  buildCreateOrderRequest,
  isTrustedCertUrl,
  toProviderOrderView,
} from "@qm/payments";
import { FakePayPal } from "../helpers/fake-paypal";
import { SUPPLIER, product, shipping, tax } from "../helpers/fixtures";

const client = (fake: FakePayPal, extra: Partial<ConstructorParameters<typeof PayPalClient>[0]> = {}) =>
  new PayPalClient({ clientId: "id", clientSecret: "secret", environment: "sandbox", webhookId: "WH", fetch: fake.fetch, ...extra });

const cart = buildCart(SUPPLIER, "USD", [product(), shipping(0), tax(1_320)]);
const binding = {
  purchase_order_id: "po_1",
  intent_id: "intent_1",
  purchase_order_number: "PO-1",
  supplier_name: "Harbor",
  brand_name: "QM",
};

describe("PayPal client", () => {
  it("builds an Orders v2 body whose breakdown matches the approved cart", () => {
    const body = buildCreateOrderRequest(cart, binding);
    const unit = body.purchase_units[0]!;
    expect(unit.amount).toMatchObject({ currency_code: "USD", value: "173.20" });
    expect(unit.amount.breakdown).toMatchObject({
      item_total: { value: "160.00" },
      tax_total: { value: "13.20" },
      shipping: { value: "0.00" },
      handling: { value: "0.00" },
    });
    expect(unit.items[0]).toMatchObject({ quantity: "2", unit_amount: { value: "80.00" }, sku: "TK-250" });
    expect(unit.custom_id).toBe("intent_1");
    expect(unit.reference_id).toBe("po_1");
  });

  it("caches OAuth tokens across calls", async () => {
    const fake = new FakePayPal();
    const c = client(fake);
    const o = await c.createOrder(buildCreateOrderRequest(cart, binding), "req-1");
    await c.getOrder(o.id);
    await c.getOrder(o.id);
    expect(fake.tokenCount).toBe(1);
  });

  it("sends PayPal-Request-Id so retries return the same order", async () => {
    const fake = new FakePayPal();
    const c = client(fake);
    const a = await c.createOrder(buildCreateOrderRequest(cart, binding), "stable-key");
    const b = await c.createOrder(buildCreateOrderRequest(cart, binding), "stable-key");
    expect(b.id).toBe(a.id);
    expect(fake.orders.size).toBe(1);
    expect(fake.calls.filter((x) => x.path === "/v2/checkout/orders").every((x) => x.requestId === "stable-key")).toBe(true);
  });

  it("surfaces PayPal issues as definitive API errors", async () => {
    const fake = new FakePayPal();
    const c = client(fake);
    const o = await c.createOrder(buildCreateOrderRequest(cart, binding), "r");
    const err = await c.captureOrder(o.id, "cap").catch((e) => e);
    expect(err).toBeInstanceOf(PayPalApiError);
    expect(err.issue).toBe("ORDER_NOT_APPROVED");
    expect(err.retryable).toBe(false);
  });

  it("reports network failures as ambiguous outcomes", async () => {
    const c = new PayPalClient({
      clientId: "id",
      clientSecret: "s",
      environment: "sandbox",
      webhookId: null,
      fetch: async () => {
        throw new TypeError("ECONNRESET");
      },
    });
    await expect(c.getAccessToken()).rejects.toBeInstanceOf(PayPalAmbiguousError);
  });

  it("times out slow requests as ambiguous", async () => {
    const slow: typeof fetch = (_u, init) =>
      new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const c = new PayPalClient({ clientId: "id", clientSecret: "s", environment: "sandbox", webhookId: null, fetch: slow, timeoutMs: 20 });
    await expect(c.getAccessToken()).rejects.toBeInstanceOf(PayPalAmbiguousError);
  });

  it("refuses to run without credentials", async () => {
    const c = new PayPalClient({ clientId: null, clientSecret: null, environment: "sandbox", webhookId: null });
    expect(c.configured).toBe(false);
    await expect(c.getAccessToken()).rejects.toBeInstanceOf(PayPalNotConfiguredError);
  });

  it("verifies webhooks only with all headers and a PayPal-hosted cert URL", async () => {
    const fake = new FakePayPal();
    const c = client(fake);
    const event = { id: "E", event_type: "X", resource: {} };
    expect(await c.verifyWebhook(fake.webhookHeaders(), event)).toBe(true);
    expect(await c.verifyWebhook({ ...fake.webhookHeaders(), "paypal-transmission-sig": undefined }, event)).toBe(false);
    expect(await c.verifyWebhook({ ...fake.webhookHeaders(), "paypal-cert-url": "https://evil.example/cert" }, event)).toBe(false);
    fake.webhookVerification = "FAILURE";
    expect(await c.verifyWebhook(fake.webhookHeaders(), event)).toBe(false);
  });

  it("accepts only HTTPS PayPal certificate hosts for the right environment", () => {
    expect(isTrustedCertUrl("https://api-m.sandbox.paypal.com/v1/notifications/certs/x", "sandbox")).toBe(true);
    expect(isTrustedCertUrl("http://api-m.sandbox.paypal.com/x", "sandbox")).toBe(false);
    expect(isTrustedCertUrl("https://api-m.paypal.com/x", "sandbox")).toBe(false);
    expect(isTrustedCertUrl("https://api-m.sandbox.paypal.com.evil.com/x", "sandbox")).toBe(false);
    expect(isTrustedCertUrl("not a url", "live")).toBe(false);
  });

  it("maps provider orders into minor units and flags malformed amounts", () => {
    const view = toProviderOrderView({
      id: "O",
      status: "APPROVED",
      purchase_units: [
        { reference_id: "po", custom_id: "i", amount: { currency_code: "USD", value: "173.20" }, payee: { merchant_id: "M" } },
      ],
    });
    expect(view).toMatchObject({ amount_minor: 17_320, currency: "USD", payee_merchant_id: "M" });
    expect(
      toProviderOrderView({ id: "O", status: "APPROVED", purchase_units: [{ amount: { currency_code: "USD", value: "1.234" } }] })
        .amount_minor,
    ).toBe(-1);
  });
});
