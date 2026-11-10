/**
 * Documentation pass over the generated OpenAPI document: schema and property descriptions,
 * example values and a few compatibility fixes, so generated SDKs, the APIMatic portal and AI
 * tools describe every field. Descriptions come from the domain's naming conventions (which the
 * codebase enforces, e.g. every `*_minor` field is integer minor units) and a glossary; anything
 * already documented in the TypeScript/Zod contracts is kept as written.
 */
type Schema = Record<string, unknown>;

/** One line per component schema. */
export const SCHEMA_DESCRIPTIONS: Record<string, string> = {
  AcceptInvitationRequest: "Accept an invitation: the invitee's name and new password, with the link token.",
  AgentStepDto: "One step of the procurement agent's research run (tool, input summary, outcome).",
  AiMode: "Whether the language model or the deterministic fallback interpreted a request.",
  AlertTestResponse: "Where a test alert was delivered.",
  AnalyticsSummaryDto: "Spend, budget, procurement and security outcomes for the workspace.",
  AnalyzeInvoiceRequest: "A supplier invoice to match against its purchase order and delivery.",
  ApiError: "Error envelope shared by every endpoint. `code` is stable; `message` is fixed per code.",
  ApproveRequest: "The owner's approval of one exact proposal, bound to the cart hash they saw.",
  AuditChainVerificationDto: "Result of re-verifying the hash-chained audit log.",
  AuditEventDto: "A tamper-evident audit log entry; each hash covers the previous one.",
  BudgetDto: "The current weekly budget: limit, reserved and spent amounts.",
  CandidateDto: "A supplier offer the agent considered, with its policy verdict and delivered cost.",
  CapturePaymentRequest: "Capture a PayPal order the buyer approved.",
  CatalogItemDto: "A supplier catalog listing (product, pack size, price).",
  CatalogItemInput: "Fields for creating or updating a catalog listing.",
  CertificateStatus: "Lifecycle of an Intent Certificate.",
  CertificateVerificationDto: "Result of verifying an Intent Certificate's signature and bindings.",
  CertificateVerificationStatus: "Outcome of a certificate verification.",
  ChangePasswordRequest: "Change the signed-in user's password.",
  ClientErrorReport: "A browser error reported for error tracking.",
  CreateInventoryItemRequest: "A new stock item, including its opening on-hand count.",
  CreateInvitationRequest: "Invite an email address with a role.",
  CreateProcurementRequest: "A natural-language purchasing instruction for the agent.",
  DataSource: "Where a piece of commercial data came from (shown as a label in the UI).",
  DelayDeliveryRequest: "Move a delivery's expected date, with a reason.",
  DeliveryDto: "A delivery for a paid purchase order (synthetic in the sandbox).",
  DeliveryStatus: "Delivery progress.",
  FeeTermDto: "A published supplier fee or shipping term; only listed fees are authorised.",
  FindingType: "Kind of security finding.",
  ForecastLineDto: "Reorder recommendation for one stock item.",
  ForecastRequest: "Parameters for a reorder forecast.",
  ForecastRunDto: "A stored forecast run with its lines.",
  ForgotPasswordRequest: "Request a password reset email.",
  IntentCertificateDto: "The owner's signed approval of one exact cart (Ed25519).",
  IntentCertificatePayload: "The signed fields of an Intent Certificate.",
  InterpretedIntentDto: "How the request was interpreted: items, demand multiplier, budget and date.",
  InventoryAdjustmentRequest: "An authorised stock change with a reason.",
  InventoryItemDto: "A stock item with current levels, usage and reorder status.",
  InventoryItemInput: "Editable details of a stock item (quantities change through adjustments).",
  InvitationCreatedResponse: "A new invitation and its one-time link.",
  InvitationDto: "An invitation to the workspace.",
  InvitationPreviewDto: "What an invitee sees before accepting.",
  InvitationStatus: "Invitation lifecycle.",
  InvitationTokenRequest: "An invitation link token.",
  InvoiceDto: "A supplier invoice and its three-way match result.",
  InvoiceMatchDto: "One check of the invoice match (amounts, quantities, duplicates).",
  InvoiceStatus: "Invoice match outcome.",
  LineKind: "Kind of cart or invoice line.",
  LoginRequest: "Email and password sign-in.",
  MandateUpdateResponse: "The new Spend Mandate version, the budget and how many approvals were revoked.",
  MarketQuoteDto: "A market price quote from Channel3, used as a reference only.",
  MarketReferenceDto: "The market reference price for an item.",
  MemberDto: "A member of the workspace.",
  MembersResponse: "Workspace members and (for owners) open invitations.",
  OpsHealthDto: "Platform health for operators: error tracking, alerting, email, webhooks, payments.",
  PayPalNotificationStatusDto: "Whether PayPal's signed notifications are arriving for this workspace.",
  PayPalOrderResponse: "The payment attempt and the PayPal order id to approve in the PayPal SDK.",
  PaymentDto: "A PayPal payment attempt for a purchase order.",
  PaymentStatus: "Payment attempt lifecycle.",
  PolicyCheckDto: "One TrustRail policy check and its result.",
  PolicyDecisionDto: "A recorded TrustRail decision with its checks and violations.",
  PolicyDecisionKind: "TrustRail's verdict on a cart.",
  ProcurementRequestDto: "A procurement request with forecast, market evidence, candidates, proposals and decisions.",
  ProcurementRequestSummaryDto: "A procurement request in a list.",
  ProductCategory: "Product category used by the Spend Mandate's category rules.",
  PublicConfig: "Feature flags and integration status visible before sign-in.",
  PurchaseOrderDto: "A proposed or committed purchase order (immutable once proposed).",
  PurchaseOrderItemDto: "A purchase order line.",
  PurchaseOrderStatus: "Purchase order lifecycle.",
  ReceiveDeliveryRequest: "Quantities received per purchase order line.",
  RecommendationDto: "The agent's recommended proposal and its explanation.",
  RefundRequest: "Refund part or all of a captured payment.",
  RejectRequest: "Reject one proposal, or every open proposal on the request.",
  RequestStatus: "Procurement request lifecycle.",
  ResetLinkResponse: "An owner-issued password reset link (null when it was emailed to the member).",
  ResetPasswordRequest: "Set a new password from a one-time reset link.",
  Role: "Workspace role: owners approve and pay, managers request, viewers read.",
  SecurityFindingDto: "A security finding (prompt injection, unauthorised fee, duplicate, signature failure...).",
  SessionUser: "The signed-in user and their workspace.",
  Severity: "Finding severity.",
  SignupRequest: "Create a workspace and its first owner.",
  SpendMandateDto: "The owner's Spend Mandate: what the business permits across purchases.",
  SpendMandateInput: "A new Spend Mandate version (optimistic concurrency on `expected_version`).",
  SupplierDetailDto: "A supplier with its catalog.",
  SupplierDto: "A supplier with its terms and mandate approval.",
  SupplierInput: "Fields for creating or updating a supplier.",
  SystemErrorDto: "A tracked error group (operators only).",
  UpdateMemberRoleRequest: "A member's new role.",
  ViolationCode: "Machine-readable TrustRail policy violation.",
  ViolationDto: "A policy violation with its severity and explanation.",
  WebhookAckResponse: "Acknowledgement returned to PayPal for a verified notification.",
};

/** Field names used across the API, defined once. */
const GLOSSARY: Record<string, string> = {
  id: "Unique identifier (UUID).",
  currency: "ISO 4217 currency code.",
  status: "Current status.",
  name: "Display name.",
  email: "Email address.",
  sku: "Stock-keeping unit code.",
  description: "Free-text description.",
  category: "Product category.",
  role: "Workspace role.",
  code: "Stable machine-readable code.",
  message: "Human-readable message (fixed per code).",
  title: "Short title.",
  kind: "Kind of entry.",
  unit: "Unit of measure (each, liter, case...).",
  reason: "Reason given by the person making the change.",
  note: "Optional note.",
  enabled: "Whether the feature is turned on.",
  password: "Password (never returned by the API).",
  token: "One-time link token from an invitation or reset email.",
  data_source: "Where this data came from.",
  demand_multiplier: "Demand relative to normal (1 = normal, 1.25 = 25% busier).",
  lead_time_days: "Days from order to delivery.",
  lead_time_days_override: "Lead time for this item, overriding the supplier's (null = use supplier's).",
  pack_quantity: "Units in one pack.",
  safety_stock: "Units to keep on hand as a buffer.",
  coverage_days: "Days of usage an order should cover.",
  on_hand: "Units currently in stock.",
  keywords: "Words that identify this item in natural-language requests.",
  search_query: "Phrase used to look up market prices (Channel3).",
  checkout_eligible: "Whether orders from this supplier can be paid through PayPal checkout.",
  active: "Whether the record is in use.",
  quarantined: "Flagged by prompt-injection screening: withheld from the agent and blocked by TrustRail.",
  quarantine_reason: "Detection rules that triggered the quarantine.",
  website: "Supplier website.",
  fee_terms: "Published fees and shipping terms; any other fee in a quote is unauthorised.",
  instruction: "The natural-language instruction from the restaurant.",
  required_by: "Date the goods are needed by (YYYY-MM-DD).",
  cart_hash: "SHA-256 of the canonical cart, bound into the Intent Certificate.",
  human_approval_required: "An owner must approve every purchase (always true).",
  severity: "Severity.",
  environment: "Deployment environment.",
  provider: "Provider in use.",
  timezone: "IANA time zone of the workspace.",
  organization_name: "Workspace (restaurant) name.",
  invited_by_name: "Name of the owner who sent the invitation.",
  correlation_id: "Request correlation id; quote it to support to find the server logs.",
  recurring: "A recurring subscription rather than a one-off purchase.",
  in_stock: "Whether the supplier currently has it in stock.",
  paypal_order_id: "PayPal Orders v2 order id.",
  paypal_capture_id: "PayPal capture id once payment completed.",
  operator: "Platform operator (may see system-wide error tracking).",
  is_self: "True for the signed-in user.",
  approved: "Approved in the current Spend Mandate.",
  version: "Version number.",
  expected_version: "The mandate version being edited (refused if it changed meanwhile).",
  approved_supplier_ids: "Suppliers the owner has approved for payment.",
  allowed_categories: "Product categories purchases may contain.",
  market_price_action: "What happens when a price exceeds the market premium: REVIEW or BLOCK.",
  duplicate_action: "What happens to a likely duplicate order: REVIEW or BLOCK.",
  subscriptions_allowed: "Whether recurring purchases are allowed.",
  sample_data: "Start the workspace with labelled sample suppliers, stock and history.",
  invite_url: "One-time invitation link (token in the URL fragment). Shown once.",
  reset_url: "One-time password reset link, or null when it was emailed to the member.",
  email_sent: "Whether the link was emailed.",
  next_cursor: "Cursor for the next page; null on the last page.",
  items: "The items in this response.",
  hash: "SHA-256 hash of this audit event.",
  prev_hash: "Hash of the previous audit event (null for the first).",
  sequence: "Position in the workspace's audit chain.",
  valid: "Whether verification passed.",
  occurrences: "How many times this error occurred.",
  fingerprint: "Grouping key for identical errors.",
  route: "API route template or page path.",
  level: "Severity level.",
  source: "Where the error came from.",
  digest: "Next.js error digest.",
  stack: "Trimmed stack trace.",
  path: "Page path.",
  user: "The signed-in user.",
  supplier: "Supplier.",
  payment: "Payment attempt.",
  certificate: "Intent Certificate.",
  purchase_order: "Purchase order.",
  delivery: "Delivery.",
  item: "The item.",
  mandate: "Spend Mandate.",
  budget: "Current weekly budget.",
  invitation: "Invitation.",
  member: "Member.",
  outcome: "How the notification was handled.",
  received: "Always true: the notification was accepted.",
  lines: "Line items.",
  organization: "The user's workspace.",
  delivered_unit_cost_minor: "Delivered cost per unit (price, shipping, tax and fees over units), in minor units; may be fractional.",
  normalized_unit_price_minor: "Quote price per unit after pack-size normalisation, in minor units; may be fractional.",
  reference_unit_price_minor: "Market reference price per unit, in minor units; may be fractional (null when no comparable quote).",
};

const humanize = (k: string) => k.replace(/_/g, " ");

/** Description from naming conventions the codebase enforces, then the glossary. */
export function describeProperty(key: string): string | undefined {
  if (GLOSSARY[key]) return GLOSSARY[key];
  if (key.endsWith("_minor")) return `${humanize(key.slice(0, -6)).replace(/^./, (c) => c.toUpperCase())}, in minor units (cents).`;
  if (key.endsWith("_bps")) return `${humanize(key.slice(0, -4)).replace(/^./, (c) => c.toUpperCase())}, in basis points (825 = 8.25%).`;
  if (key.endsWith("_pct")) return `${humanize(key.slice(0, -4)).replace(/^./, (c) => c.toUpperCase())}, in percent.`;
  if (key.endsWith("_at")) return `When ${humanize(key.slice(0, -3))} happened (ISO 8601, UTC).`;
  if (key.endsWith("_date")) return `${humanize(key).replace(/^./, (c) => c.toUpperCase())} (YYYY-MM-DD).`;
  if (key.endsWith("_ids")) return `Ids of the related ${humanize(key.slice(0, -4))}s.`;
  if (key.endsWith("_id")) return `Id of the related ${humanize(key.slice(0, -3))}.`;
  if (key.endsWith("_days")) return `${humanize(key.slice(0, -5)).replace(/^./, (c) => c.toUpperCase())}, in days.`;
  if (key.endsWith("_hours")) return `${humanize(key.slice(0, -6)).replace(/^./, (c) => c.toUpperCase())}, in hours.`;
  if (key.endsWith("_minutes")) return `${humanize(key.slice(0, -8)).replace(/^./, (c) => c.toUpperCase())}, in minutes.`;
  if (key.endsWith("_ms")) return `${humanize(key.slice(0, -3)).replace(/^./, (c) => c.toUpperCase())}, in milliseconds.`;
  if (key.endsWith("_count") || key.endsWith("_total")) return `Number of ${humanize(key.replace(/_(count|total)$/, ""))}.`;
  return undefined;
}

const SAMPLE_UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

/** A plausible example value for a scalar property, or undefined when none fits. */
export function exampleFor(key: string, schema: Schema): unknown {
  const type = Array.isArray(schema.type) ? (schema.type as string[]).find((t) => t !== "null") : (schema.type as string | undefined);
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (type === "string") {
    if (key === "paypal_order_id") return "5O190127TN364715T";
    if (key === "paypal_capture_id") return "3C679366HH908993F";
    if (schema.format === "uuid" || key === "id" || key.endsWith("_id")) return SAMPLE_UUID;
    if (schema.format === "email" || key === "email") return "owner@example.com";
    if (key.endsWith("_at")) return "2026-11-10T18:30:00.000Z";
    if (key.endsWith("_date") || key === "required_by" || key === "day" || key === "week_start") return "2026-11-12";
    if (key === "currency") return "USD";
    if (key === "sku") return "PKG-TAKEOUT-32";
    if (key === "cart_hash") return `sha256:${"9f".repeat(32)}`;
    if (key === "timezone") return "America/Los_Angeles";
    if (key.includes("url") || key === "website" || key === "link") return "https://example.com";
    if (key === "name" || key.endsWith("_name")) return "Harbor Restaurant Supply";
    if (key === "password" || key.endsWith("_password")) return "correct-horse-battery-staple";
    return undefined;
  }
  if (type === "integer") {
    if (key.endsWith("_minor")) return 17320;
    if (key.endsWith("_bps")) return 825;
    if (key.endsWith("_days")) return 3;
    return typeof schema.minimum === "number" ? Math.max(schema.minimum, 1) : 1;
  }
  if (type === "number") return key === "demand_multiplier" ? 1.25 : 1;
  if (type === "boolean") return true;
  return undefined;
}

/**
 * TypeScript has one `number` type, so DTO fields arrive as `number`. Fields that are whole
 * numbers by construction (money in minor units, counts, versions, stock quantities, days) are
 * published as `integer`, which generated SDKs map to int. The contract test checks real
 * responses against this, so a fractional value here would fail CI.
 */
const INTEGER_FIELDS = new Set([
  "version",
  "sequence",
  "quantity",
  "quantity_received",
  "pack_quantity",
  "on_hand",
  "safety_stock",
  "inbound_confirmed",
  "committed",
  "available",
  "reorder_point",
  "occurrences",
  "count",
  "orders",
  "events_checked",
  "received_24h",
  "rejected_24h",
  "rejected_signatures_24h",
  "unconfirmed_captures_7d",
  "capture_pending",
  "open_errors",
  "recipients",
  "email_recipients",
  "emails_sent",
  "catalog_items",
  "certificate_ttl_minutes",
  "duplicate_window_hours",
  "max_market_price_premium_pct",
]);
/** Per-unit comparison costs divide a pack price by its units, so they can be fractional. */
const FRACTIONAL_FIELDS = new Set(["delivered_unit_cost_minor", "normalized_unit_price_minor", "reference_unit_price_minor"]);
const isIntegerField = (key: string) =>
  !FRACTIONAL_FIELDS.has(key) &&
  (INTEGER_FIELDS.has(key) ||
    /_minor$|_bps$|_days$|_count$|^orders_|^items_|^requests_|^findings_|^blocked_|^pending_|^prompt_|^duplicate_|^revoked_/.test(key));

/** Channel3 market data is normalised from retail listings: its quantities can be fractional. */
const DECIMAL_SCHEMAS = new Set(["MarketQuoteDto", "MarketReferenceDto"]);

function walkProperties(schema: unknown, decimal = false): void {
  if (!schema || typeof schema !== "object") return;
  const s = schema as Schema;
  // OpenAPI 3.1 allows numeric exclusiveMinimum; several generators still expect 3.0's boolean
  // form, so integer bounds are expressed as an inclusive minimum instead (identical meaning).
  if (typeof s.exclusiveMinimum === "number" && s.type === "integer") {
    s.minimum = s.exclusiveMinimum + 1;
    delete s.exclusiveMinimum;
  }
  // Boolean constants (`human_approval_required: true`) become string enums in some SDK
  // generators; they are published as booleans and the constraint is stated in words.
  if (typeof s.const === "boolean") {
    s.description = `${typeof s.description === "string" ? `${s.description} ` : ""}Always ${String(s.const)}.`;
    s.type = "boolean";
    delete s.const;
  }
  // `additionalProperties: {}` (any value) is read as "object values" by some generators;
  // `true` says the same thing unambiguously.
  const extra = s.additionalProperties;
  if (extra && typeof extra === "object" && Object.keys(extra).length === 0) s.additionalProperties = true;
  // `anyOf: [X, null]` is valid 3.1, but some SDK generators drop the null branch; `oneOf`
  // means the same here (null never matches X) and keeps `X | null` in generated types.
  const anyOf = s.anyOf as Schema[] | undefined;
  if (anyOf?.length === 2 && anyOf.some((b) => b.type === "null")) {
    s.oneOf = anyOf;
    delete s.anyOf;
  }
  const props = s.properties as Record<string, Schema> | undefined;
  if (props) {
    for (const [key, prop] of Object.entries(props)) {
      if (!decimal && isIntegerField(key)) {
        if (prop.type === "number") prop.type = "integer";
        else if (Array.isArray(prop.type)) prop.type = (prop.type as string[]).map((t) => (t === "number" ? "integer" : t));
      }
      if (!("$ref" in prop)) {
        if (!prop.description) {
          const d = describeProperty(key);
          if (d) prop.description = d;
        }
        if (prop.example === undefined && prop.default === undefined) {
          const ex = exampleFor(key, prop);
          if (ex !== undefined) prop.example = ex;
        }
      }
      walkProperties(prop, decimal);
    }
  }
  for (const k of ["items", "additionalProperties"]) if (typeof s[k] === "object") walkProperties(s[k], decimal);
  for (const k of ["anyOf", "oneOf", "allOf"]) for (const x of (s[k] as unknown[] | undefined) ?? []) walkProperties(x, decimal);
}

export function enrich(openapi: {
  components: { schemas: Record<string, Schema>; parameters: Record<string, Schema> };
  paths: Record<string, Record<string, Schema>>;
}): void {
  for (const [name, schema] of Object.entries(openapi.components.schemas)) {
    if (!schema.description && SCHEMA_DESCRIPTIONS[name]) schema.description = SCHEMA_DESCRIPTIONS[name];
    walkProperties(schema, DECIMAL_SCHEMAS.has(name));
  }
  for (const p of Object.values(openapi.components.parameters)) {
    const schema = p.schema as Schema;
    schema.description ??= p.description;
    if (p.name === "X-Requested-With") p.example = "quartermaster";
    if (p.name === "Idempotency-Key") p.example = "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22";
  }
  for (const ops of Object.values(openapi.paths)) {
    for (const op of Object.values(ops)) {
      for (const param of (op.parameters as Schema[] | undefined) ?? []) {
        if (param.in === "path") {
          param.example = SAMPLE_UUID;
          (param.schema as Schema).description ??= param.description;
        }
      }
      const body = op.requestBody as Schema | undefined;
      if (body && !body.description) {
        const ref = (((body.content as Schema)["application/json"] as Schema).schema as Schema).$ref as string | undefined;
        const name = ref?.split("/").pop();
        body.description = (name && SCHEMA_DESCRIPTIONS[name]) || String(op.summary);
      }
    }
  }
}
