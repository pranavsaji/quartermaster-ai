/** Minimal typed views of the PayPal Orders v2 resources we consume. */

export interface Money {
  currency_code: string;
  value: string;
}

export interface PayPalItem {
  name: string;
  quantity: string;
  unit_amount: Money;
  sku?: string;
  category?: "PHYSICAL_GOODS" | "DIGITAL_GOODS" | "DONATION";
  description?: string;
}

export interface PayPalPurchaseUnitRequest {
  reference_id: string;
  custom_id: string;
  invoice_id: string;
  description?: string;
  soft_descriptor?: string;
  amount: Money & {
    breakdown: {
      item_total: Money;
      shipping?: Money;
      handling?: Money;
      tax_total?: Money;
    };
  };
  items: PayPalItem[];
}

export interface CreateOrderRequest {
  intent: "CAPTURE";
  purchase_units: PayPalPurchaseUnitRequest[];
  payment_source?: {
    paypal: {
      experience_context: {
        brand_name?: string;
        shipping_preference?: "NO_SHIPPING" | "GET_FROM_FILE" | "SET_PROVIDED_ADDRESS";
        user_action?: "PAY_NOW" | "CONTINUE";
        return_url?: string;
        cancel_url?: string;
      };
    };
  };
}

export interface PayPalCapture {
  id: string;
  status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
  amount: Money;
  final_capture?: boolean;
  custom_id?: string;
  invoice_id?: string;
  status_details?: { reason?: string };
  create_time?: string;
}

export interface PayPalOrder {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  intent?: string;
  purchase_units?: {
    reference_id?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: Money;
    payee?: { merchant_id?: string; email_address?: string };
    payments?: { captures?: PayPalCapture[] };
  }[];
  payer?: { payer_id?: string; email_address?: string };
  links?: { href: string; rel: string; method?: string }[];
  create_time?: string;
  update_time?: string;
}

export interface PayPalRefund {
  id: string;
  status: "CANCELLED" | "FAILED" | "PENDING" | "COMPLETED";
  amount?: Money;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  resource_type?: string;
  resource: Record<string, unknown>;
  create_time?: string;
  summary?: string;
}

export interface WebhookHeaders {
  "paypal-auth-algo"?: string;
  "paypal-cert-url"?: string;
  "paypal-transmission-id"?: string;
  "paypal-transmission-sig"?: string;
  "paypal-transmission-time"?: string;
}
