import type { PaymentDto, PublicConfig } from "@qm/contracts";
import { vi } from "vitest";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Replaces global fetch with a router over `METHOD /path` keys. Each key maps
 * to a queue of responses (the last one repeats). Every call is recorded.
 */
export function mockFetch(routes: Record<string, Array<Response | (() => Response | Promise<Response>)>>) {
  const calls: RecordedRequest[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    const path = new URL(url, "http://localhost").pathname;
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    calls.push({ method, url, headers, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const queue = routes[`${method} ${path}`];
    if (!queue || queue.length === 0) throw new Error(`Unexpected request ${method} ${path}`);
    const next = queue.length > 1 ? queue.shift()! : queue[0]!;
    return typeof next === "function" ? next() : next.clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

export const PUBLIC_CONFIG: PublicConfig = {
  environment: "test",
  paypal: { enabled: true, client_id: "sb-client", sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core", environment: "sandbox" },
  market_data: { provider: "channel3", enabled: true },
  ai: { enabled: false, mode: "DETERMINISTIC_FALLBACK" },
};

export function payment(overrides: Partial<PaymentDto> = {}): PaymentDto {
  return {
    id: "pay-1",
    intent_id: "intent-1",
    purchase_order_id: "po-1",
    status: "ORDER_CREATED",
    paypal_order_id: "ORDER-1",
    paypal_capture_id: null,
    amount_minor: 12345,
    currency: "USD",
    captured_amount_minor: null,
    refunded_amount_minor: 0,
    failure_code: null,
    failure_message: null,
    created_at: "2026-11-09T10:00:00.000Z",
    updated_at: "2026-11-09T10:00:00.000Z",
    completed_at: null,
    ...overrides,
  };
}
