import { describe, expect, it } from "vitest";
import { PayPalAmbiguousError, PayPalApiError, PayPalClient, PayPalInvalidResponseError, PayPalOrderSchema } from "@qm/payments";

const json = (status: number, body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A PayPal stub that issues a token and answers every other call with `reply`. */
function client(reply: () => Response, token: () => Response = () => json(200, { access_token: "t", expires_in: 3600 })) {
  const logs: { event: string; data: Record<string, unknown> }[] = [];
  const c = new PayPalClient({
    clientId: "id",
    clientSecret: "secret",
    environment: "sandbox",
    webhookId: "WH",
    fetch: async (input) => (String(input).endsWith("/v1/oauth2/token") ? token() : reply()),
    log: (event, data) => logs.push({ event, data }),
  });
  return { c, logs };
}

const headers = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT",
  "paypal-transmission-id": "tx-1",
  "paypal-transmission-sig": "sig",
  "paypal-transmission-time": new Date().toISOString(),
};

describe("PayPal response validation", () => {
  it("raises a malformed 2xx capture response as ambiguous, not as a definite failure", async () => {
    const { c, logs } = client(() => json(201, { status: "COMPLETED" }));
    const err = await c.captureOrder("ORDER1", "req-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PayPalInvalidResponseError);
    expect(err).toBeInstanceOf(PayPalAmbiguousError);
    expect(err).not.toBeInstanceOf(PayPalApiError);
    expect((err as PayPalInvalidResponseError).invalidPaths).toContain("id");
    expect(logs.find((l) => l.event === "paypal.invalid_response")?.data).toMatchObject({ operation: "orders.capture", status: 201 });
  });

  it("rejects captures nested in an order when their amount is missing", async () => {
    const { c } = client(() => json(201, { id: "O", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "C", status: "COMPLETED" }] } }] }));
    const err = (await c.captureOrder("O", "req-2").catch((e: unknown) => e)) as PayPalInvalidResponseError;
    expect(err).toBeInstanceOf(PayPalInvalidResponseError);
    expect(err.invalidPaths[0]).toMatch(/^purchase_units\.0\.payments\.captures\.0\.amount/);
  });

  it("treats a non-JSON 2xx body as ambiguous", async () => {
    const { c } = client(() => json(200, "<html>gateway</html>"));
    await expect(c.refundCapture("CAP", "req-3")).rejects.toBeInstanceOf(PayPalInvalidResponseError);
  });

  it("rejects an unknown refund status", async () => {
    const { c } = client(() => json(201, { id: "R", status: "MAYBE" }));
    await expect(c.refundCapture("CAP", "req-4")).rejects.toBeInstanceOf(PayPalInvalidResponseError);
  });

  it("rejects an OAuth token response without an access token", async () => {
    const { c } = client(() => json(200, {}), () => json(200, { token_type: "Bearer" }));
    await expect(c.getAccessToken()).rejects.toBeInstanceOf(PayPalInvalidResponseError);
  });

  it("does not treat a malformed verification response as verified", async () => {
    const { c } = client(() => json(200, { verification_status: "success!" }));
    await expect(c.verifyWebhook(headers, { id: "E", event_type: "X", resource: {} })).rejects.toBeInstanceOf(PayPalAmbiguousError);
  });

  it("keeps definite 4xx errors as PayPalApiError", async () => {
    const { c } = client(() => json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] }));
    const err = (await c.captureOrder("O", "req-5").catch((e: unknown) => e)) as PayPalApiError;
    expect(err).toBeInstanceOf(PayPalApiError);
    expect(err.issue).toBe("ORDER_NOT_APPROVED");
  });

  it("passes valid orders through, keeping fields it does not model", async () => {
    const order = { id: "O", status: "COMPLETED", purchase_units: [{ amount: { currency_code: "USD", value: "1.00" }, payments: { captures: [{ id: "C", status: "COMPLETED", amount: { currency_code: "USD", value: "1.00" } }] } }], supplementary: { x: 1 } };
    const { c } = client(() => json(200, order));
    const got = await c.getOrder("O");
    expect(got.purchase_units?.[0]?.payments?.captures?.[0]?.id).toBe("C");
    expect((got as unknown as { supplementary: unknown }).supplementary).toEqual({ x: 1 });
    expect(PayPalOrderSchema.safeParse(order).success).toBe(true);
  });
});
