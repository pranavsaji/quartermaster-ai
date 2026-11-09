import type { CreateOrderRequest, PayPalOrder } from "@qm/payments";

interface StoredOrder {
  order: PayPalOrder;
  body: CreateOrderRequest;
  requestId: string;
}

/**
 * In-process stand-in for the PayPal sandbox REST API used by integration tests. It implements
 * the subset Quartermaster calls (OAuth, Orders v2 create/get/capture, refunds and webhook
 * signature verification) including PayPal-Request-Id idempotency, and lets tests inject faults.
 */
export class FakePayPal {
  orders = new Map<string, StoredOrder>();
  requestIds = new Map<string, unknown>();
  calls: { method: string; path: string; requestId: string | null }[] = [];
  captureCount = 0;
  tokenCount = 0;
  webhookVerification: "SUCCESS" | "FAILURE" = "SUCCESS";
  /** Next capture: perform it but drop the response (simulated network loss). */
  dropNextCaptureResponse = false;
  declineNextCapture = false;
  captureStatus: "COMPLETED" | "PENDING" = "COMPLETED";
  /** Applied to GET responses to simulate a provider-side amount discrepancy. */
  tamperAmount: string | null = null;
  private seq = 0;

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const requestId = headers.get("PayPal-Request-Id");
    this.calls.push({ method, path: url.pathname, requestId });
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "paypal-debug-id": "fake" } });

    if (url.pathname === "/v1/oauth2/token") {
      this.tokenCount++;
      return json(200, { access_token: "fake-token", expires_in: 32_400, token_type: "Bearer" });
    }
    if (headers.get("Authorization") !== "Bearer fake-token") return json(401, { name: "AUTHENTICATION_FAILURE" });

    if (requestId && this.requestIds.has(requestId)) return json(200, this.requestIds.get(requestId));

    if (method === "POST" && url.pathname === "/v2/checkout/orders") {
      const body = JSON.parse(String(init?.body)) as CreateOrderRequest;
      const unit = body.purchase_units[0]!;
      const b = unit.amount.breakdown;
      const sum = [b.item_total, b.shipping, b.handling, b.tax_total].reduce((a, m) => a + Math.round(Number(m?.value ?? 0) * 100), 0);
      const items = unit.items.reduce((a, i) => a + Math.round(Number(i.unit_amount.value) * 100) * Number(i.quantity), 0);
      if (sum !== Math.round(Number(unit.amount.value) * 100) || items !== Math.round(Number(b.item_total.value) * 100)) {
        return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "AMOUNT_MISMATCH", description: "breakdown does not add up" }] });
      }
      const id = `FAKE${(++this.seq).toString().padStart(13, "0")}`;
      const order: PayPalOrder = {
        id,
        status: "CREATED",
        intent: "CAPTURE",
        purchase_units: [{ reference_id: unit.reference_id, custom_id: unit.custom_id, invoice_id: unit.invoice_id, amount: { currency_code: unit.amount.currency_code, value: unit.amount.value }, payee: { merchant_id: "FAKEMERCHANT" } }],
        links: [{ href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}`, rel: "payer-action" }],
      };
      this.orders.set(id, { order, body, requestId: requestId ?? "" });
      if (requestId) this.requestIds.set(requestId, order);
      return json(201, order);
    }

    const orderMatch = /^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/.exec(url.pathname);
    if (orderMatch) {
      const stored = this.orders.get(orderMatch[1]!);
      if (!stored) return json(404, { name: "RESOURCE_NOT_FOUND", details: [{ issue: "INVALID_RESOURCE_ID" }] });
      if (!orderMatch[2]) {
        const copy = structuredClone(stored.order);
        if (this.tamperAmount) copy.purchase_units![0]!.amount!.value = this.tamperAmount;
        return json(200, copy);
      }
      // capture
      if (stored.order.status === "COMPLETED") return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
      if (stored.order.status !== "APPROVED") return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] });
      if (this.declineNextCapture) {
        this.declineNextCapture = false;
        return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] });
      }
      this.captureCount++;
      const amount = stored.order.purchase_units![0]!.amount!;
      stored.order.status = "COMPLETED";
      stored.order.payer = { payer_id: "FAKEPAYER" };
      stored.order.purchase_units![0]!.payments = {
        captures: [{ id: `CAP${this.seq}${this.captureCount}`, status: this.captureStatus, amount: { ...amount }, final_capture: true, custom_id: stored.body.purchase_units[0]!.custom_id }],
      };
      if (requestId) this.requestIds.set(requestId, stored.order);
      if (this.dropNextCaptureResponse) {
        this.dropNextCaptureResponse = false;
        throw new TypeError("fetch failed: socket hang up");
      }
      return json(201, stored.order);
    }

    const refundMatch = /^\/v2\/payments\/captures\/([^/]+)\/refund$/.exec(url.pathname);
    if (refundMatch && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { amount?: { value: string; currency_code: string } };
      const refund = { id: `REF${++this.seq}`, status: "COMPLETED", amount: body.amount };
      if (requestId) this.requestIds.set(requestId, refund);
      return json(201, refund);
    }

    if (url.pathname === "/v1/notifications/verify-webhook-signature") {
      return json(200, { verification_status: this.webhookVerification });
    }
    return json(404, { name: "NOT_FOUND" });
  };

  /** Simulates the buyer approving the order in the PayPal popup. */
  approve(orderId: string): void {
    const stored = this.orders.get(orderId);
    if (!stored) throw new Error(`unknown order ${orderId}`);
    stored.order.status = "APPROVED";
  }

  webhookHeaders(): Record<string, string> {
    return {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",
      "paypal-transmission-id": `tx-${++this.seq}`,
      "paypal-transmission-sig": "c2lnbmF0dXJl",
      "paypal-transmission-time": new Date().toISOString(),
    };
  }
}
