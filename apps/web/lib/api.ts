/**
 * Typed client for the Quartermaster v1 API. Shapes come from `@qm/contracts`
 * and are the single source of truth shared with the Express API.
 *
 * Endpoints the API marks as idempotent (I) go through `withIdempotency`, which
 * attaches an `Idempotency-Key` per user action and reuses it on retries.
 */
import type {
  AcceptInvitationRequest,
  AnalyticsSummaryDto,
  AnalyzeInvoiceRequest,
  ApproveRequest,
  AuditChainVerificationDto,
  AuditEventDto,
  CatalogItemDto,
  CatalogItemInput,
  CertificateVerificationDto,
  ChangePasswordRequest,
  CreateInventoryItemRequest,
  CreateInvitationRequest,
  CreateProcurementRequest,
  DelayDeliveryRequest,
  DeliveryDto,
  DeliveryMutationResponse,
  ForecastRunDto,
  InventoryAdjustmentRequest,
  InventoryAdjustmentResponse,
  InventoryItemDto,
  InventoryItemInput,
  InvitationDto,
  InvitationPreviewDto,
  InvoiceDto,
  ItemsResponse,
  MandateResponse,
  MandateUpdateResponse,
  MemberDto,
  MembersResponse,
  OpsHealthDto,
  Page,
  PayPalNotificationStatusDto,
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
  SignupRequest,
  SpendMandateInput,
  SupplierDetailDto,
  SupplierDto,
  SupplierInput,
  SystemErrorDto,
} from "@qm/contracts";
import { request, type RequestOptions } from "./http";
import { withIdempotency } from "./idempotency";
import {
  ensureShape,
  isApprovalResponse,
  isCaptureResponse,
  isInvitationCreated,
  isPayment,
  isPayPalOrderResponse,
  isRefundResponse,
  isResetLink,
} from "./response-guards";
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

export interface ErrorsFilter extends PageQuery {
  status?: "OPEN" | "RESOLVED" | "ALL";
}

/** `POST /ops/alerts/test`: where the test alert went. */
export interface TestAlertResult {
  email_recipients: number;
  emails_sent: number;
  webhook_sent: boolean;
}

/** Public (signed-out) pages handle a 401 themselves: there is no session to restore. */
const PUBLIC = { redirectOnUnauthorized: false } as const;

const get = <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options);
const post = <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body: body ?? {} });
const put = <T>(path: string, body: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body });

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
    /** Creates a workspace and its owner, and signs them in. */
    signup: (body: SignupRequest) => post<SessionResponse>("/auth/signup", body, PUBLIC),
    /** Always answers 202, whether or not the address has an account. */
    forgotPassword: (body: { email: string }) => post<{ status: string }>("/auth/password/forgot", body, PUBLIC),
    resetPassword: (body: { token: string; password: string }) => post<{ status: string }>("/auth/password/reset", body, PUBLIC),
    /** A wrong current password is a 400, not a 401, so it never signs the user out. */
    changePassword: (body: ChangePasswordRequest) => post<{ status: string }>("/auth/password/change", body),
  },

  invitations: {
    lookup: (body: { token: string }, o?: Signal) =>
      post<{ invitation: InvitationPreviewDto }>("/invitations/lookup", body, { ...PUBLIC, signal: o?.signal }),
    accept: (body: AcceptInvitationRequest) => post<SessionResponse>("/invitations/accept", body, PUBLIC),
  },

  members: {
    list: (o?: Signal) => get<MembersResponse>("/members", o),
    invite: async (body: CreateInvitationRequest) =>
      ensureShape(await post<unknown>("/members/invitations", body), isInvitationCreated, "an invitation"),
    revokeInvitation: (invitationId: string) => post<{ invitation: InvitationDto }>(`/members/invitations/${id(invitationId)}/revoke`),
    setRole: (userId: string, role: MemberDto["role"]) => put<{ member: MemberDto }>(`/members/${id(userId)}/role`, { role }),
    remove: (userId: string) => post<unknown>(`/members/${id(userId)}/remove`),
    resetLink: async (userId: string) =>
      ensureShape(await post<unknown>(`/members/${id(userId)}/password-reset`), isResetLink, "a reset link"),
  },

  inventory: {
    list: (o?: Signal) => get<ItemsResponse<InventoryItemDto>>("/inventory", o),
    adjust: (itemId: string, body: InventoryAdjustmentInput) =>
      idempotent<InventoryAdjustmentResponse>("POST", `/inventory/${id(itemId)}/adjustments`, body),
    forecast: (body: ForecastInput) => post<ForecastRunDto>("/inventory/forecast", body),
    create: (body: CreateInventoryItemRequest) => post<{ item: InventoryItemDto }>("/inventory", body),
    update: (itemId: string, body: InventoryItemInput) => put<{ item: InventoryItemDto }>(`/inventory/${id(itemId)}`, body),
  },

  suppliers: {
    list: (o?: Signal) => get<ItemsResponse<SupplierDto>>("/suppliers", o),
    get: (supplierId: string, o?: Signal) => get<{ supplier: SupplierDetailDto }>(`/suppliers/${id(supplierId)}`, o),
    create: (body: SupplierInput) => post<{ supplier: SupplierDetailDto }>("/suppliers", body),
    update: (supplierId: string, body: SupplierInput) => put<{ supplier: SupplierDetailDto }>(`/suppliers/${id(supplierId)}`, body),
    addCatalogItem: (supplierId: string, body: CatalogItemInput) =>
      post<{ item: CatalogItemDto }>(`/suppliers/${id(supplierId)}/catalog`, body),
    updateCatalogItem: (supplierId: string, itemId: string, body: CatalogItemInput) =>
      put<{ item: CatalogItemDto }>(`/suppliers/${id(supplierId)}/catalog/${id(itemId)}`, body),
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
    /** Asks the API to re-read the PayPal order (never captures). */
    sync: async (paymentId: string) => ensureShape(await post<unknown>(`/payments/${id(paymentId)}/sync`), isPayment, "a payment"),
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
    paypalNotifications: (o?: Signal) => get<{ status: PayPalNotificationStatusDto }>("/security/paypal-notifications", o),
  },

  /** Platform operators only (SessionUser.operator); everyone else gets 403. */
  ops: {
    health: (o?: Signal) => get<OpsHealthDto>("/ops/health", o),
    errors: (q?: ErrorsFilter, o?: Signal) =>
      get<Page<SystemErrorDto>>("/ops/errors", { ...o, query: { ...pageQuery(q), status: q?.status } }),
    resolveError: (errorId: string) => post<{ error: SystemErrorDto }>(`/ops/errors/${id(errorId)}/resolve`),
    testAlert: () => post<TestAlertResult>("/ops/alerts/test"),
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
