/**
 * Response envelopes of the v1 API: the JSON bodies routes send around the
 * DTOs in ./dto. Shared so the web client types exactly what the API returns.
 */
import type {
  BudgetDto,
  InvitationDto,
  MemberDto,
  DeliveryDto,
  IntentCertificateDto,
  InventoryItemDto,
  PaymentDto,
  PurchaseOrderDto,
  SessionUser,
  SpendMandateDto,
} from "./dto";

/** Unpaginated list endpoints (`GET /inventory`, `/suppliers`, `/deliveries`, `/invoices`). */
export interface ItemsResponse<T> {
  items: T[];
}

/** `POST /auth/login`, `GET /auth/me`. */
export interface SessionResponse {
  user: SessionUser;
}

/** `GET /mandates/current`. */
export interface MandateResponse {
  mandate: SpendMandateDto;
  budget: BudgetDto;
}

/** `PUT /mandates/current`. */
export interface MandateUpdateResponse extends MandateResponse {
  /** Active intent certificates revoked because they were signed under the previous version. */
  revoked_certificates: number;
}

/** `POST /inventory/:id/adjustments`. */
export interface InventoryAdjustmentResponse {
  item: InventoryItemDto;
}

/** `POST /procurement/requests/:id/approve`. `purchase_order.certificate` is the same certificate. */
export interface ApprovalResponse {
  purchase_order: PurchaseOrderDto;
  certificate: IntentCertificateDto;
}

/** `POST /intents/:id/paypal-order`. */
export interface PayPalOrderResponse {
  payment: PaymentDto;
  paypal_order_id: string;
}

/** `POST /payments/:id/capture`. */
export interface CaptureResponse {
  payment: PaymentDto;
  purchase_order: PurchaseOrderDto;
}

/** `POST /payments/:id/refund`. */
export interface RefundResponse {
  payment: PaymentDto;
}

/** `POST /deliveries/:id/receive` and `POST /deliveries/:id/delay`. */
export interface DeliveryMutationResponse {
  delivery: DeliveryDto;
}

/** `GET /members`. Invitations are listed for owners only (empty otherwise). */
export interface MembersResponse {
  members: MemberDto[];
  invitations: InvitationDto[];
}

/**
 * `POST /members/invitations`. The link is returned to the owner so it can be shared even when no
 * email provider is configured; it is never retrievable again.
 */
export interface InvitationCreatedResponse {
  invitation: InvitationDto;
  invite_url: string;
  email_sent: boolean;
}

/**
 * `POST /members/:id/password-reset` (managers and viewers only). When the link was emailed to the
 * member, `reset_url` is null; otherwise it is the one-time link for the owner to pass on.
 */
export interface ResetLinkResponse {
  reset_url: string | null;
  expires_at: string;
  email_sent: boolean;
}

/** `POST /webhooks/paypal`: acknowledgement PayPal receives for a verified event. */
export interface WebhookAckResponse {
  received: true;
  outcome: "PROCESSED" | "IGNORED" | "DUPLICATE";
}

/** `POST /ops/alerts/test`: where the test alert went. */
export interface AlertTestResponse {
  email_recipients: number;
  emails_sent: number;
  webhook_sent: boolean;
}
