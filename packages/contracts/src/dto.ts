/**
 * Response DTOs for the Quartermaster v1 API. Every amount is integer minor units.
 * Timestamps are ISO-8601 strings in UTC.
 */
import type {
  AiMode,
  CertificateStatus,
  CertificateVerificationStatus,
  DataSource,
  DeliveryStatus,
  FindingType,
  InvitationStatus,
  InvoiceStatus,
  LineKind,
  PaymentStatus,
  PolicyDecisionKind,
  ProductCategory,
  PurchaseOrderStatus,
  RequestStatus,
  ReservationStatus,
  Role,
  Severity,
  ViolationCode,
} from "./enums";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlation_id?: string;
  };
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

/* ------------------------------------------------------------------ Auth */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organization: { id: string; name: string; timezone: string; currency: string };
  /** Platform operator (OPERATOR_EMAILS): may see system-wide error tracking. */
  operator: boolean;
}

export interface PublicConfig {
  environment: string;
  paypal: { enabled: boolean; client_id: string | null; sdk_url: string; environment: "sandbox" | "live" };
  market_data: { provider: "channel3"; enabled: boolean };
  ai: { enabled: boolean; mode: AiMode };
  accounts: {
    /** Anyone may create a workspace. */
    signup_enabled: boolean;
    /** Outbound email is configured: invitations and reset links are emailed. */
    email_enabled: boolean;
  };
  /** Show the shared sample-workspace accounts on the sign-in page. */
  sample_accounts_hint: boolean;
}

/* ------------------------------------------------------------- Inventory */

export interface InventoryItemDto {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  on_hand: number;
  inbound_confirmed: number;
  committed: number;
  available: number;
  avg_daily_usage: number;
  lead_time_days: number;
  safety_stock: number;
  coverage_days: number;
  reorder_point: number;
  days_of_cover: number | null;
  status: "OK" | "LOW" | "CRITICAL" | "OUT";
  preferred_supplier_id: string | null;
  data_source: DataSource;
  /**
   * Editable details (PUT /inventory/:id round-trips them). Optional until every API build sends
   * them; the edit form treats a missing value as blank.
   */
  search_query: string;
  keywords: string[];
  lead_time_days_override: number | null;
}

export interface ForecastLineDto {
  inventory_item_id: string;
  sku: string;
  name: string;
  unit: string;
  base_daily_usage: number;
  demand_multiplier: number;
  forecast_daily_usage: number;
  lead_time_days: number;
  safety_stock: number;
  coverage_days: number;
  on_hand: number;
  inbound_confirmed: number;
  committed: number;
  available: number;
  reorder_point: number;
  target_stock: number;
  needs_reorder: boolean;
  suggested_quantity: number;
  explanation: string;
}

export interface ForecastRunDto {
  id: string;
  demand_multiplier: number;
  created_at: string;
  method: "REORDER_POINT_V1";
  lines: ForecastLineDto[];
}

/* ------------------------------------------------------------- Suppliers */

export interface FeeTermDto {
  code: string;
  label: string;
  kind: "SHIPPING" | "FEE";
  amount_minor: number;
  waived_over_minor: number | null;
}

export interface SupplierDto {
  id: string;
  name: string;
  approved: boolean;
  active: boolean;
  checkout_eligible: boolean;
  lead_time_days: number;
  tax_rate_bps: number;
  fee_terms: FeeTermDto[];
  website: string | null;
  description: string | null;
  quarantined: boolean;
  catalog_items: number;
  data_source: DataSource;
}

export interface CatalogItemDto {
  id: string;
  supplier_id: string;
  sku: string;
  title: string;
  description: string;
  category: ProductCategory;
  inventory_item_id: string | null;
  pack_quantity: number;
  unit_price_minor: number;
  currency: string;
  in_stock: boolean;
  recurring: boolean;
  /** Flagged by injection screening: withheld from the agent, and TrustRail blocks carts with it. */
  quarantined: boolean;
  quarantine_reason: string | null;
  updated_at: string;
}

export interface SupplierDetailDto extends SupplierDto {
  catalog: CatalogItemDto[];
  created_at: string;
}

/* ----------------------------------------------------------- Procurement */

export interface InterpretedIntentDto {
  inventory_item_ids: string[];
  demand_multiplier: number;
  budget_limit_minor: number | null;
  required_by: string | null;
  notes: string;
  unsupported_requests: string[];
  ai_mode: AiMode;
}

export interface MarketQuoteDto {
  id: string;
  source: "CHANNEL3_MARKET";
  title: string;
  merchant_domain: string;
  url: string;
  price_minor: number;
  currency: string;
  pack_quantity: number | null;
  normalized_unit_price_minor: number | null;
  comparable: boolean;
  observed_at: string;
  availability: string;
}

export interface MarketReferenceDto {
  inventory_item_id: string;
  reference_unit_price_minor: number | null;
  sample_size: number;
  observed_at: string | null;
  status: "AVAILABLE" | "UNAVAILABLE" | "STALE" | "DISABLED" | "ERROR";
  quotes: MarketQuoteDto[];
}

export interface CandidateDto {
  id: string;
  inventory_item_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_approved: boolean;
  checkout_eligible: boolean;
  catalog_item_id: string;
  sku: string;
  title: string;
  pack_quantity: number;
  packs: number;
  units: number;
  item_subtotal_minor: number;
  shipping_minor: number;
  tax_minor: number;
  fees_minor: number;
  delivered_total_minor: number;
  delivered_unit_cost_minor: number;
  lead_time_days: number;
  rank: number | null;
  eligible: boolean;
  ineligible_reasons: string[];
  quarantined: boolean;
  data_source: DataSource;
}

export interface PurchaseOrderItemDto {
  id: string;
  kind: LineKind;
  sku: string | null;
  description: string;
  category: ProductCategory | null;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  inventory_item_id: string | null;
  pack_quantity: number | null;
}

export interface ViolationDto {
  code: ViolationCode;
  severity: "BLOCK" | "REVIEW";
  message: string;
  evidence?: Record<string, unknown>;
}

export interface PolicyCheckDto {
  code: string;
  passed: boolean;
  detail: string;
}

export interface PolicyDecisionDto {
  id: string;
  purchase_order_id: string;
  decision: PolicyDecisionKind;
  violations: ViolationDto[];
  checks: PolicyCheckDto[];
  human_approval_required: boolean;
  mandate_version: number;
  policy_version: string;
  input_digest: string;
  evaluated_at: string;
}

export interface IntentCertificateDto {
  id: string;
  status: CertificateStatus;
  payload: IntentCertificatePayload;
  key_id: string;
  signature: string;
  algorithm: "Ed25519";
  issued_at: string;
  expires_at: string;
}

export interface IntentCertificatePayload {
  certificate_version: 1;
  intent_id: string;
  organization_id: string;
  buyer_id: string;
  purchase_order_id: string;
  supplier_id: string;
  cart_hash: string;
  mandate_id: string;
  mandate_version: number;
  policy_decision_id: string;
  currency: string;
  approved_amount_minor: number;
  approved_at: string;
  expires_at: string;
  nonce: string;
  key_id: string;
}

export interface CertificateVerificationDto {
  intent_id: string;
  status: CertificateVerificationStatus;
  valid: boolean;
  checks: PolicyCheckDto[];
  certificate: IntentCertificateDto;
  verified_at: string;
}

export interface PaymentDto {
  id: string;
  intent_id: string;
  purchase_order_id: string;
  status: PaymentStatus;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  amount_minor: number;
  currency: string;
  captured_amount_minor: number | null;
  refunded_amount_minor: number;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface PurchaseOrderDto {
  id: string;
  number: string;
  request_id: string | null;
  supplier_id: string;
  supplier_name: string;
  status: PurchaseOrderStatus;
  currency: string;
  subtotal_minor: number;
  shipping_minor: number;
  tax_minor: number;
  fees_minor: number;
  total_minor: number;
  cart_hash: string;
  items: PurchaseOrderItemDto[];
  policy_decision: PolicyDecisionDto | null;
  certificate: IntentCertificateDto | null;
  payment: PaymentDto | null;
  delivery: DeliveryDto | null;
  created_at: string;
}

export interface SecurityFindingDto {
  id: string;
  type: FindingType;
  severity: Severity;
  title: string;
  description: string;
  source_kind: string;
  source_id: string | null;
  evidence: Record<string, unknown>;
  related_purchase_order_id: string | null;
  related_request_id: string | null;
  created_at: string;
}

export interface AgentStepDto {
  id: string;
  tool: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  duration_ms: number;
  summary: string;
  started_at: string;
}

export interface RecommendationDto {
  summary: string;
  rationale: string[];
  ai_mode: AiMode;
}

export interface ProcurementRequestDto {
  id: string;
  status: RequestStatus;
  instruction: string;
  currency: string;
  budget_limit_minor: number | null;
  required_by: string | null;
  allow_alternatives: boolean;
  intent: InterpretedIntentDto | null;
  forecast: ForecastRunDto | null;
  market: MarketReferenceDto[];
  candidates: CandidateDto[];
  proposals: PurchaseOrderDto[];
  active_proposal_id: string | null;
  recommendation: RecommendationDto | null;
  security_findings: SecurityFindingDto[];
  agent_steps: AgentStepDto[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementRequestSummaryDto {
  id: string;
  status: RequestStatus;
  instruction: string;
  total_minor: number | null;
  currency: string;
  created_at: string;
}

/* --------------------------------------------------------------- Mandate */

export interface SpendMandateDto {
  id: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  currency: string;
  weekly_budget_minor: number;
  per_order_limit_minor: number;
  auto_approval_limit_minor: number;
  human_approval_required: true;
  approved_supplier_ids: string[];
  allowed_categories: ProductCategory[];
  max_market_price_premium_pct: number;
  market_price_action: "REVIEW" | "BLOCK";
  duplicate_window_hours: number;
  duplicate_action: "REVIEW" | "BLOCK";
  subscriptions_allowed: boolean;
  certificate_ttl_minutes: number;
  max_quantity_multiple_of_need: number;
  created_by: string;
  created_at: string;
}

export interface BudgetDto {
  period_start: string;
  period_end: string;
  currency: string;
  limit_minor: number;
  reserved_minor: number;
  spent_minor: number;
  remaining_minor: number;
}

export interface BudgetReservationDto {
  id: string;
  amount_minor: number;
  status: ReservationStatus;
  intent_id: string;
  created_at: string;
}

/* ------------------------------------------------------------ Fulfillment */

export interface DeliveryDto {
  id: string;
  purchase_order_id: string;
  supplier_id: string;
  status: DeliveryStatus;
  expected_date: string;
  original_expected_date: string;
  delivered_at: string | null;
  delay_reason: string | null;
  data_source: "SYNTHETIC";
}

export interface InvoiceMatchDto {
  check: string;
  passed: boolean;
  severity: Severity | null;
  detail: string;
}

export interface InvoiceDto {
  id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_number: string;
  invoice_date: string;
  currency: string;
  total_minor: number;
  status: InvoiceStatus;
  settlement_allowed: boolean;
  matches: InvoiceMatchDto[];
  created_at: string;
}

/* -------------------------------------------------------------- Analytics */

export interface AnalyticsSummaryDto {
  currency: string;
  budget: BudgetDto;
  totals: {
    approved_spend_minor: number;
    captured_spend_minor: number;
    refunded_minor: number;
    orders_paid: number;
    orders_blocked: number;
    pending_approvals: number;
    requests_total: number;
  };
  security: {
    findings_total: number;
    blocked_attempts: number;
    prompt_injections_detected: number;
    duplicate_invoices_flagged: number;
    duplicate_captures: number;
  };
  inventory: { items_low: number; items_critical: number; items_out: number };
  deliveries: { scheduled: number; delayed: number; delivered: number };
  spend_by_week: { week_start: string; captured_minor: number; reserved_minor: number }[];
  /** Captured spend net of refunds, per supplier, largest first. */
  spend_by_supplier: { supplier: string; captured_minor: number; orders: number }[];
  spend_by_category: { category: string; captured_minor: number }[];
  decisions_by_kind: { decision: PolicyDecisionKind; count: number }[];
  findings_by_type: { type: FindingType; count: number }[];
  procurement_time_ms: { median: number | null; p90: number | null };
}

export interface AuditEventDto {
  id: string;
  sequence: number;
  action: string;
  actor_type: "USER" | "SYSTEM" | "AGENT" | "PAYPAL";
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  data: Record<string, unknown>;
  hash: string;
  prev_hash: string | null;
  correlation_id: string | null;
  created_at: string;
}

export interface AuditChainVerificationDto {
  valid: boolean;
  events_checked: number;
  first_invalid_sequence: number | null;
}

/* ------------------------------------------------------------- Accounts */

export interface MemberDto {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  joined_at: string;
  is_self: boolean;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  invited_by_name: string | null;
  created_at: string;
  expires_at: string;
}

/** What someone opening an invitation link sees before accepting. */
export interface InvitationPreviewDto {
  organization_name: string;
  email: string;
  role: Role;
  invited_by_name: string | null;
  expires_at: string;
}

/* ----------------------------------------------------------- Monitoring */

export interface SystemErrorDto {
  id: string;
  fingerprint: string;
  source: "api" | "web" | "job" | "monitor";
  level: "warning" | "error" | "fatal";
  code: string;
  message: string;
  route: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  last_correlation_id: string | null;
  last_alerted_at: string | null;
  resolved_at: string | null;
}

/** Whether PayPal's signed notifications (webhooks) are reaching this deployment for an organisation. */
export interface PayPalNotificationStatusDto {
  configured: boolean;
  last_received_at: string | null;
  last_event_type: string | null;
  received_24h: number;
  /** Completed captures in the last 7 days with no verified PayPal notification. */
  unconfirmed_captures_7d: number;
  rejected_signatures_24h: number;
}

export interface OpsHealthDto {
  error_tracking: { open_errors: number; sentry: boolean };
  alerting: { email: boolean; webhook: boolean; recipients: number };
  email: { enabled: boolean; provider: "resend" | "webhook" | "none" };
  paypal_webhooks: { last_received_at: string | null; received_24h: number; rejected_24h: number };
  payments: { capture_pending: number; oldest_pending_minutes: number | null };
}

/** Result of a red-team run: what detection saw, and what TrustRail decides if the agent obeyed the listing anyway. */
export interface RedTeamResultDto {
  detection: {
    quarantined: boolean;
    suspicious: boolean;
    score: number;
    severity: Severity;
    signals: { rule: string; excerpt: string }[];
  };
  /** The worst case: the agent was fully fooled and proposed exactly what the listing asked for. */
  worst_case: {
    supplier: { id: string | null; name: string; approved: boolean; active: boolean };
    cart: {
      lines: { kind: string; description: string; quantity: number; line_total_minor: number }[];
      total_minor: number;
      currency: string;
    };
    decision: PolicyDecisionKind;
    violations: { code: string; severity: "BLOCK" | "REVIEW"; message: string }[];
    /** Whether an owner could approve it at all (a BLOCK cannot be approved by anyone). */
    approvable: boolean;
    mandate_version: number;
  };
  /** The ceiling a hijacked agent works under, from the active Spend Mandate. */
  bound: { per_order_limit_minor: number; weekly_remaining_minor: number; human_approval_required: boolean; currency: string };
}
