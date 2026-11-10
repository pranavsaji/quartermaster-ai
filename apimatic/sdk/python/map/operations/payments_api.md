<!-- Generated file — do not edit; regenerated with the SDK. -->

# PaymentsApi — operations

Accessor: `client.payments_api` · Source: `quartermaster_ai_trust_rail_api/apis/payments_api.py` · 6 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.payments_api.capture_payment

- **Route**: `POST /payments/{id}/capture`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def capture_payment(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: CapturePaymentRequest | CapturePaymentRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `idempotency_key`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `PaymentsCaptureResponse`
- **Returns (raw)**: `ApiResult[PaymentsCaptureResponse, CapturePaymentErrorBody]`
- **Error**: `CapturePaymentErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `CapturePaymentRequest` | `quartermaster_ai_trust_rail_api/models/capture_payment_request.py` |
| `CapturePaymentRequestDict` | `quartermaster_ai_trust_rail_api/models/capture_payment_request.py` |
| `PaymentsCaptureResponse` | `quartermaster_ai_trust_rail_api/models/payments_capture_response.py` |
| `CapturePaymentErrorBody` | `quartermaster_ai_trust_rail_api/errors/capture_payment_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.payments_api.create_pay_pal_order

- **Route**: `POST /intents/{id}/paypal-order`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def create_pay_pal_order(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `idempotency_key`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key`
- **Returns (parsed)**: `PayPalOrderResponse`
- **Returns (raw)**: `ApiResult[PayPalOrderResponse, CreatePayPalOrderErrorBody]`
- **Error**: `CreatePayPalOrderErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `PayPalOrderResponse` | `quartermaster_ai_trust_rail_api/models/pay_pal_order_response.py` |
| `CreatePayPalOrderErrorBody` | `quartermaster_ai_trust_rail_api/errors/create_pay_pal_order_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.payments_api.get_payment

- **Route**: `GET /payments/{id}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_payment(id_: UUID, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id`
- **Returns (parsed)**: `PaymentDto`
- **Returns (raw)**: `ApiResult[PaymentDto, GetPaymentErrorBody]`
- **Error**: `GetPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `PaymentDto` | `quartermaster_ai_trust_rail_api/models/payment_dto.py` |
| `GetPaymentErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_payment_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.payments_api.receive_pay_pal_webhook

- **Route**: `POST /webhooks/paypal`
- **Signature**: `def receive_pay_pal_webhook(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `WebhookAckResponse`
- **Returns (raw)**: `ApiResult[WebhookAckResponse, ReceivePayPalWebhookErrorBody]`
- **Error**: `ReceivePayPalWebhookErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `WebhookAckResponse` | `quartermaster_ai_trust_rail_api/models/webhook_ack_response.py` |
| `ReceivePayPalWebhookErrorBody` | `quartermaster_ai_trust_rail_api/errors/receive_pay_pal_webhook_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.payments_api.refund_payment

- **Route**: `POST /payments/{id}/refund`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def refund_payment(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: RefundRequest | RefundRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `idempotency_key`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `PaymentsRefundResponse`
- **Returns (raw)**: `ApiResult[PaymentsRefundResponse, RefundPaymentErrorBody]`
- **Error**: `RefundPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `RefundRequest` | `quartermaster_ai_trust_rail_api/models/refund_request.py` |
| `RefundRequestDict` | `quartermaster_ai_trust_rail_api/models/refund_request.py` |
| `PaymentsRefundResponse` | `quartermaster_ai_trust_rail_api/models/payments_refund_response.py` |
| `RefundPaymentErrorBody` | `quartermaster_ai_trust_rail_api/errors/refund_payment_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.payments_api.sync_payment

- **Route**: `POST /payments/{id}/sync`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def sync_payment(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `PaymentDto`
- **Returns (raw)**: `ApiResult[PaymentDto, SyncPaymentErrorBody]`
- **Error**: `SyncPaymentErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `PaymentDto` | `quartermaster_ai_trust_rail_api/models/payment_dto.py` |
| `SyncPaymentErrorBody` | `quartermaster_ai_trust_rail_api/errors/sync_payment_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

