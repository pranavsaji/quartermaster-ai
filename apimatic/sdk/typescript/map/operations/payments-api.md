<!-- Generated file — do not edit; regenerated with the SDK. -->

# PaymentsApi — operations

Accessor: `client.paymentsApi` · Source: `src/resources/payments-api.ts` · 6 operations · Request and error types: namespace `PaymentsApi`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### capturePayment

- **Signature**: `capturePayment(request: PaymentsApi.CapturePaymentRequestParams, options?: RequestOptions): ApiPromise<PaymentsCaptureResponse, PaymentsApi.CapturePaymentError>`
- **Wire**: `POST /payments/{id}/capture`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `PaymentsCaptureResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `PaymentsApi.CapturePaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [422] `ApiErrorModel` · `"apiErrorModel7"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `PaymentsApi.CapturePaymentRequestParams` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `CapturePaymentRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `CapturePaymentRequest` | `capturePaymentRequestSchema` | `src/models/capture-payment-request.ts` |
| `PaymentsCaptureResponse` | `paymentsCaptureResponseSchema` | `src/models/payments-capture-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### createPayPalOrder

- **Signature**: `createPayPalOrder(request: PaymentsApi.CreatePayPalOrderRequest, options?: RequestOptions): ApiPromise<PayPalOrderResponse, PaymentsApi.CreatePayPalOrderError>`
- **Wire**: `POST /intents/{id}/paypal-order`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `PayPalOrderResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `PaymentsApi.CreatePayPalOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [422] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `PaymentsApi.CreatePayPalOrderRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `PayPalOrderResponse` | `payPalOrderResponseSchema` | `src/models/pay-pal-order-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### getPayment

- **Signature**: `getPayment(request: PaymentsApi.GetPaymentRequest, options?: RequestOptions): ApiPromise<PaymentDto, PaymentsApi.GetPaymentError>`
- **Wire**: `GET /payments/{id}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `PaymentDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `PaymentsApi.GetPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `PaymentsApi.GetPaymentRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `PaymentDto` | `paymentDtoSchema` | `src/models/payment-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### receivePayPalWebhook

- **Signature**: `receivePayPalWebhook(options?: RequestOptions): ApiPromise<WebhookAckResponse, PaymentsApi.ReceivePayPalWebhookError>`
- **Wire**: `POST /webhooks/paypal`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `WebhookAckResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `PaymentsApi.ReceivePayPalWebhookError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [409] `ApiErrorModel` · `"apiErrorModel2"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `WebhookAckResponse` | `webhookAckResponseSchema` | `src/models/webhook-ack-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### refundPayment

- **Signature**: `refundPayment(request: PaymentsApi.RefundPaymentRequest, options?: RequestOptions): ApiPromise<PaymentsRefundResponse, PaymentsApi.RefundPaymentError>`
- **Wire**: `POST /payments/{id}/refund`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `PaymentsRefundResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `PaymentsApi.RefundPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [422] `ApiErrorModel` · `"apiErrorModel7"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `PaymentsApi.RefundPaymentRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `RefundRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `RefundRequest` | `refundRequestSchema` | `src/models/refund-request.ts` |
| `PaymentsRefundResponse` | `paymentsRefundResponseSchema` | `src/models/payments-refund-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### syncPayment

- **Signature**: `syncPayment(request: PaymentsApi.SyncPaymentRequest, options?: RequestOptions): ApiPromise<PaymentDto, PaymentsApi.SyncPaymentError>`
- **Wire**: `POST /payments/{id}/sync`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `PaymentDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `PaymentsApi.SyncPaymentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `PaymentsApi.SyncPaymentRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `PaymentDto` | `paymentDtoSchema` | `src/models/payment-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

