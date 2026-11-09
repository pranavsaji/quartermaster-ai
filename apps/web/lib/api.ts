/**
 * Typed client for the Quartermaster v1 API. Shapes come from `@qm/contracts`
 * and are the single source of truth shared with the Express API.
 *
 * Endpoints the API marks as idempotent (I) go through `withIdempotency`, which
 * attaches an `Idempotency-Key` per user action and reuses it on retries.
 */
import type {
  AnalyticsSummaryDto,
  AnalyzeInvoiceRequest,
  ApproveRequest,
  AuditChainVerificationDto,
  AuditEventDto,
  CertificateVerificationDto,
  CreateProcurementRequest,
  DelayDeliveryRequest,
  DeliveryDto,
  DeliveryMutationResponse,
  ForecastRunDto,
  InventoryAdjustmentRequest,
  InventoryAdjustmentResponse,
  InventoryItemDto,
  InvoiceDto,
  ItemsResponse,
  MandateResponse,
  MandateUpdateResponse,
  Page,
  PolicyDecisionDto,
  ProcurementRequestDto,
  ProcurementRequestSummaryDto,
  PublicConfig,
  PurchaseOrderDto,
  PurchaseOrderStatus,
  ReceiveDeliveryRequest,
  RefundRequest,
  RejectRequest,
  SecurityFindingDto,
  SessionResponse,
  SpendMandateInput,
  SupplierDto,
} from "@qm/contracts";
import { request, type RequestOptions } from "./http";
import { withIdempotency } from "./idempotency";
import { ensureShape, isApprovalResponse, isCaptureResponse, isPayment, isPayPalOrderResponse, isRefundResponse } from "./response-guards";
import { sharedRequest } from "./shared-cache";

type Signal = { signal?: AbortSignal };

/** How long a shared read (see `sharedRequest`) is reused across pages, unless the user refreshes. */
const SHARED_TTL_MS = 15_000;

export interface PageQuery {
  limit?: number;
  cursor?: string | null;
}

export interface PurchaseOrdersFilter extends PageQuery {
  /** Only these statuses, filtered by the API (sent as `status=A,B`). Omit or pass [] for all. */
  statuses?: readonly PurchaseOrderStatus[];
}

export interface SecurityEventsFilter extends PageQuery {
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type?: string;
}

/**
 * An adjustment, optionally guarded by the on-hand quantity the user saw: the API then refuses with
 * 409 STOCK_CHANGED (details.on_hand = the current quantity) instead of applying a delta that was
 * worked out from stale stock.
 */
export type InventoryAdjustmentInput = InventoryAdjustmentRequest & { expected_on_hand?: number };

export interface ForecastInput {
  demand_multiplier: number;
  inventory_item_ids?: string[];
  horizon_days?: number;
}

const get = <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options);
const post = <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body: body ?? {} });

/**
 * POST/PUT to an (I) endpoint with a per-action idempotency key. With `check`, the response's shape
 * is verified inside the idempotent action, so an unreadable answer keeps the key for a safe retry.
 */
function idempotent<T>(
  method: "POST" | "PUT",
  path: string,
  body: unknown,
  check?: { guard: (value: unknown) => value is T; what: string },
): Promise<T> {
  return withIdempotency(`${method} ${path}`, body, async (idempotencyKey) => {
    const result = await request<unknown>(method, path, { body: body ?? {}, idempotencyKey });
    return check ? ensureShape(result, check.guard, check.what) : (result as T);
  });
}

const id = (value: string) => encodeURIComponent(value);

const pageQuery = (q?: PageQuery) => ({ limit: q?.limit, cursor: q?.cursor ?? undefined });

export const api = {
  config: {
    public: (o?: Signal) => get<PublicConfig>("/config/public", { ...o, redirectOnUnauthorized: false }),
  },

  auth: {
    login: (body: { email: string; password: string }) => post<SessionResponse>("/auth/login", body, { redirectOnUnauthorized: false }),
    logout: () => post<unknown>("/auth/logout", {}, { redirectOnUnauthorized: false }),
    me: (o?: Signal & { redirectOnUnauthorized?: boolean }) => get<SessionResponse>("/auth/me", o),
  },

  inventory: {
    list: (o?: Signal) => get<ItemsResponse<InventoryItemDto>>("/inventory", o),
    adjust: (itemId: string, body: InventoryAdjustmentInput) =>
      idempotent<InventoryAdjustmentResponse>("POST", `/inventory/${id(itemId)}/adjustments`, body),
    forecast: (body: ForecastInput) => post<ForecastRunDto>("/inventory/forecast", body),
  },

  suppliers: {
    list: (o?: Signal) => get<ItemsResponse<SupplierDto>>("/suppliers", o),
  },

  procurement: {
    list: (q?: PageQuery, o?: Signal) => get<Page<ProcurementRequestSummaryDto>>("/procurement/requests", { ...o, query: pageQuery(q) }),
    create: (body: CreateProcurementRequest) => idempotent<ProcurementRequestDto>("POST", "/procurement/requests", body),
    get: (requestId: string, o?: Signal) => get<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}`, o),
    research: (requestId: string) => post<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}/research`),
    evaluate: (requestId: string) => post<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}/evaluate`),
    approve: (requestId: string, body: ApproveRequest) =>
      idempotent("POST", `/procurement/requests/${id(requestId)}/approve`, body, { guard: isApprovalResponse, what: "an approval" }),
    /** With `purchase_order_id` rejects only that proposal; without it, every open proposal on the request. */
    reject: (requestId: string, body: RejectRequest) => post<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}/reject`, body),
  },

  mandates: {
    current: (o?: Signal) => get<MandateResponse>("/mandates/current", o),
    update: (body: SpendMandateInput) => idempotent<MandateUpdateResponse>("PUT", "/mandates/current", body),
  },

  intents: {
    verify: (intentId: string, o?: Signal) => get<CertificateVerificationDto>(`/intents/${id(intentId)}/verify`, o),
    createPayPalOrder: (intentId: string) =>
      idempotent("POST", `/intents/${id(intentId)}/paypal-order`, {}, { guard: isPayPalOrderResponse, what: "a PayPal order" }),
  },

  payments: {
    get: async (paymentId: string, o?: Signal) => ensureShape(await get<unknown>(`/payments/${id(paymentId)}`, o), isPayment, "a payment"),
    capture: (paymentId: string, body: { paypal_order_id: string }) =>
      idempotent("POST", `/payments/${id(paymentId)}/capture`, body, { guard: isCaptureResponse, what: "a capture result" }),
    refund: (paymentId: string, body: RefundRequest) =>
      idempotent("POST", `/payments/${id(paymentId)}/refund`, body, { guard: isRefundResponse, what: "a refund result" }),
  },

  purchaseOrders: {
    list: (q?: PurchaseOrdersFilter, o?: Signal) =>
      get<Page<PurchaseOrderDto>>("/purchase-orders", {
        ...o,
        query: { ...pageQuery(q), status: q?.statuses?.length ? q.statuses.join(",") : undefined },
      }),
    get: (poId: string, o?: Signal) => get<PurchaseOrderDto>(`/purchase-orders/${id(poId)}`, o),
  },

  deliveries: {
    list: (o?: Signal) => get<ItemsResponse<DeliveryDto>>("/deliveries", o),
    receive: (deliveryId: string, body: ReceiveDeliveryRequest) =>
      idempotent<DeliveryMutationResponse>("POST", `/deliveries/${id(deliveryId)}/receive`, body),
    delay: (deliveryId: string, body: DelayDeliveryRequest) => post<DeliveryMutationResponse>(`/deliveries/${id(deliveryId)}/delay`, body),
  },

  invoices: {
    list: (o?: Signal) => get<ItemsResponse<InvoiceDto>>("/invoices", o),
    analyze: (body: AnalyzeInvoiceRequest) => idempotent<InvoiceDto>("POST", "/invoices/analyze", body),
  },

  security: {
    events: (q?: SecurityEventsFilter, o?: Signal) =>
      get<Page<SecurityFindingDto>>("/security/events", {
        ...o,
        query: { ...pageQuery(q), severity: q?.severity, type: q?.type },
      }),
    decisions: (q?: PageQuery, o?: Signal) => get<Page<PolicyDecisionDto>>("/security/decisions", { ...o, query: pageQuery(q) }),
    audit: (q?: PageQuery, o?: Signal) => get<Page<AuditEventDto>>("/security/audit", { ...o, query: pageQuery(q) }),
    verifyAudit: (o?: Signal) => get<AuditChainVerificationDto>("/security/audit/verify", o),
  },

  analytics: {
    /** Shared by Overview, Security and Analytics; `fresh` (the Refresh button) bypasses the cache. */
    summary: (o?: Signal & { fresh?: boolean }) =>
      sharedRequest("/analytics/summary", () => get<AnalyticsSummaryDto>("/analytics/summary"), {
        ttlMs: SHARED_TTL_MS,
        signal: o?.signal,
        fresh: o?.fresh,
      }),
  },
} as const;
