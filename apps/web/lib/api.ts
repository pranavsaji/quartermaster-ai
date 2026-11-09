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
  ApprovalResponse,
  ApproveRequest,
  AuditChainVerificationDto,
  AuditEventDto,
  CaptureResponse,
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
  PaymentDto,
  PayPalOrderResponse,
  PolicyDecisionDto,
  ProcurementRequestDto,
  ProcurementRequestSummaryDto,
  PublicConfig,
  PurchaseOrderDto,
  ReceiveDeliveryRequest,
  RefundRequest,
  RefundResponse,
  RejectRequest,
  SecurityFindingDto,
  SessionResponse,
  SpendMandateInput,
  SupplierDto,
} from "@qm/contracts";
import { request, type RequestOptions } from "./http";
import { withIdempotency } from "./idempotency";

type Signal = { signal?: AbortSignal };

export interface PageQuery {
  limit?: number;
  cursor?: string | null;
}

export interface SecurityEventsFilter extends PageQuery {
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type?: string;
}

export interface ForecastInput {
  demand_multiplier: number;
  inventory_item_ids?: string[];
  horizon_days?: number;
}

const get = <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options);
const post = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>("POST", path, { ...options, body: body ?? {} });

/** POST/PUT to an (I) endpoint with a per-action idempotency key. */
function idempotent<T>(method: "POST" | "PUT", path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return withIdempotency(`${method} ${path}`, body, (idempotencyKey) =>
    request<T>(method, path, { ...options, body: body ?? {}, idempotencyKey }),
  );
}

const id = (value: string) => encodeURIComponent(value);

const pageQuery = (q?: PageQuery) => ({ limit: q?.limit, cursor: q?.cursor ?? undefined });

export const api = {
  config: {
    public: (o?: Signal) => get<PublicConfig>("/config/public", { ...o, redirectOnUnauthorized: false }),
  },

  auth: {
    login: (body: { email: string; password: string }) =>
      post<SessionResponse>("/auth/login", body, { redirectOnUnauthorized: false }),
    logout: () => post<unknown>("/auth/logout", {}, { redirectOnUnauthorized: false }),
    me: (o?: Signal & { redirectOnUnauthorized?: boolean }) => get<SessionResponse>("/auth/me", o),
  },

  inventory: {
    list: (o?: Signal) => get<ItemsResponse<InventoryItemDto>>("/inventory", o),
    adjust: (itemId: string, body: InventoryAdjustmentRequest) =>
      idempotent<InventoryAdjustmentResponse>("POST", `/inventory/${id(itemId)}/adjustments`, body),
    forecast: (body: ForecastInput) => post<ForecastRunDto>("/inventory/forecast", body),
  },

  suppliers: {
    list: (o?: Signal) => get<ItemsResponse<SupplierDto>>("/suppliers", o),
  },

  procurement: {
    list: (q?: PageQuery, o?: Signal) =>
      get<Page<ProcurementRequestSummaryDto>>("/procurement/requests", { ...o, query: pageQuery(q) }),
    create: (body: CreateProcurementRequest) => idempotent<ProcurementRequestDto>("POST", "/procurement/requests", body),
    get: (requestId: string, o?: Signal) => get<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}`, o),
    research: (requestId: string) => post<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}/research`),
    evaluate: (requestId: string) => post<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}/evaluate`),
    approve: (requestId: string, body: ApproveRequest) =>
      idempotent<ApprovalResponse>("POST", `/procurement/requests/${id(requestId)}/approve`, body),
    /** With `purchase_order_id` rejects only that proposal; without it, every open proposal on the request. */
    reject: (requestId: string, body: RejectRequest) =>
      post<ProcurementRequestDto>(`/procurement/requests/${id(requestId)}/reject`, body),
  },

  mandates: {
    current: (o?: Signal) => get<MandateResponse>("/mandates/current", o),
    update: (body: SpendMandateInput) => idempotent<MandateUpdateResponse>("PUT", "/mandates/current", body),
  },

  intents: {
    verify: (intentId: string, o?: Signal) => get<CertificateVerificationDto>(`/intents/${id(intentId)}/verify`, o),
    createPayPalOrder: (intentId: string) =>
      idempotent<PayPalOrderResponse>("POST", `/intents/${id(intentId)}/paypal-order`, {}),
  },

  payments: {
    get: (paymentId: string, o?: Signal) => get<PaymentDto>(`/payments/${id(paymentId)}`, o),
    capture: (paymentId: string, body: { paypal_order_id: string }) =>
      idempotent<CaptureResponse>("POST", `/payments/${id(paymentId)}/capture`, body),
    refund: (paymentId: string, body: RefundRequest) =>
      idempotent<RefundResponse>("POST", `/payments/${id(paymentId)}/refund`, body),
  },

  purchaseOrders: {
    list: (q?: PageQuery, o?: Signal) =>
      get<Page<PurchaseOrderDto>>("/purchase-orders", { ...o, query: pageQuery(q) }),
    get: (poId: string, o?: Signal) => get<PurchaseOrderDto>(`/purchase-orders/${id(poId)}`, o),
  },

  deliveries: {
    list: (o?: Signal) => get<ItemsResponse<DeliveryDto>>("/deliveries", o),
    receive: (deliveryId: string, body: ReceiveDeliveryRequest) =>
      idempotent<DeliveryMutationResponse>("POST", `/deliveries/${id(deliveryId)}/receive`, body),
    delay: (deliveryId: string, body: DelayDeliveryRequest) =>
      post<DeliveryMutationResponse>(`/deliveries/${id(deliveryId)}/delay`, body),
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
    decisions: (q?: PageQuery, o?: Signal) =>
      get<Page<PolicyDecisionDto>>("/security/decisions", { ...o, query: pageQuery(q) }),
    audit: (q?: PageQuery, o?: Signal) => get<Page<AuditEventDto>>("/security/audit", { ...o, query: pageQuery(q) }),
    verifyAudit: (o?: Signal) => get<AuditChainVerificationDto>("/security/audit/verify", o),
  },

  analytics: {
    summary: (o?: Signal) => get<AnalyticsSummaryDto>("/analytics/summary", o),
  },
} as const;

/**
 * Fetches every page of a cursor-paginated endpoint, up to `maxPages` as a
 * safety bound.
 */
export async function fetchAllPages<T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
  maxPages = 10,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < maxPages; i += 1) {
    const page: Page<T> = await fetchPage(cursor);
    items.push(...page.items);
    if (!page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}
