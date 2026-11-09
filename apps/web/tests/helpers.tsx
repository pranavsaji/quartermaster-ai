import type {
  DeliveryDto,
  InventoryItemDto,
  PaymentDto,
  PolicyDecisionDto,
  PublicConfig,
  PurchaseOrderDto,
  Role,
  SessionUser,
  ViolationDto,
} from "@qm/contracts";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { SessionProvider, type Session } from "@/components/session/SessionProvider";
import { userCan } from "@/lib/roles";

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

export function sessionUser(role: Role = "OWNER", overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u-1",
    email: `${role.toLowerCase()}@demo.quartermaster.dev`,
    name: "Dana Owner",
    role,
    organization: { id: "org-1", name: "Demo Bistro", timezone: "America/New_York", currency: "USD" },
    ...overrides,
  };
}

export function testSession(role: Role = "OWNER"): Session {
  const user = sessionUser(role);
  return {
    user,
    config: PUBLIC_CONFIG,
    can: (c) => userCan(user, c),
    signOut: async () => undefined,
    signingOut: false,
    signOutError: undefined,
  };
}

/** Renders inside a real SessionProvider (default: the owner) and re-renders inside it too. */
export function renderWithSession(ui: ReactElement, options: { role?: Role } & Omit<RenderOptions, "wrapper"> = {}) {
  const { role = "OWNER", ...rest } = options;
  const session = testSession(role);
  const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider session={session}>{children}</SessionProvider>;
  return render(ui, { wrapper, ...rest });
}

export function violation(overrides: Partial<ViolationDto> = {}): ViolationDto {
  return {
    code: "MARKET_PRICE_PREMIUM_EXCEEDED",
    severity: "REVIEW",
    message: "Unit price is 12% above the market reference.",
    ...overrides,
  };
}

export function policyDecision(overrides: Partial<PolicyDecisionDto> = {}): PolicyDecisionDto {
  return {
    id: "dec-1",
    purchase_order_id: "po-1",
    decision: "REVIEW_REQUIRED",
    violations: [violation()],
    checks: [{ code: "SUPPLIER_APPROVED", passed: true, detail: "Harbor Foodservice is approved." }],
    human_approval_required: true,
    mandate_version: 3,
    policy_version: "trustrail-1",
    input_digest: "sha256:abc",
    evaluated_at: "2026-11-09T10:00:00.000Z",
    ...overrides,
  };
}

export function purchaseOrder(overrides: Partial<PurchaseOrderDto> = {}): PurchaseOrderDto {
  return {
    id: "po-1",
    number: "PO-1001",
    request_id: "req-1",
    supplier_id: "sup-1",
    supplier_name: "Harbor Foodservice",
    status: "PROPOSED",
    currency: "USD",
    subtotal_minor: 10000,
    shipping_minor: 0,
    tax_minor: 0,
    fees_minor: 0,
    total_minor: 10000,
    cart_hash: "sha256:cart-1",
    items: [
      {
        id: "line-1",
        kind: "PRODUCT",
        sku: "HF-TK32",
        description: "Takeaway containers 32oz",
        category: "food_packaging",
        quantity: 4,
        unit_price_minor: 2500,
        line_total_minor: 10000,
        inventory_item_id: "inv-1",
        pack_quantity: null,
      },
    ],
    policy_decision: policyDecision(),
    certificate: null,
    payment: null,
    delivery: null,
    created_at: "2026-11-09T10:00:00.000Z",
    ...overrides,
  };
}

export function delivery(overrides: Partial<DeliveryDto> = {}): DeliveryDto {
  return {
    id: "del-1",
    purchase_order_id: "po-1",
    supplier_id: "sup-1",
    status: "SCHEDULED",
    expected_date: "2026-11-12",
    original_expected_date: "2026-11-12",
    delivered_at: null,
    delay_reason: null,
    data_source: "SYNTHETIC",
    ...overrides,
  };
}

export function inventoryItem(overrides: Partial<InventoryItemDto> = {}): InventoryItemDto {
  return {
    id: "inv-1",
    sku: "HF-TK32",
    name: "Takeaway containers 32oz",
    category: "food_packaging",
    unit: "cases",
    on_hand: 10,
    inbound_confirmed: 0,
    committed: 0,
    available: 10,
    avg_daily_usage: 2,
    lead_time_days: 2,
    safety_stock: 4,
    coverage_days: 7,
    reorder_point: 8,
    days_of_cover: 5,
    status: "OK",
    preferred_supplier_id: null,
    data_source: "SYNTHETIC",
    ...overrides,
  };
}
