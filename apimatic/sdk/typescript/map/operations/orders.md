<!-- Generated file — do not edit; regenerated with the SDK. -->

# Orders — operations

Accessor: `client.orders` · Source: `src/resources/orders.ts` · 7 operations · Request and error types: namespace `Orders`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### analyzeInvoice

- **Signature**: `analyzeInvoice(request: Orders.AnalyzeInvoiceRequestParams, options?: RequestOptions): ApiPromise<InvoiceDto, Orders.AnalyzeInvoiceError>`
- **Wire**: `POST /invoices/analyze`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `InvoiceDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.AnalyzeInvoiceError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [422] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Orders.AnalyzeInvoiceRequestParams` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `AnalyzeInvoiceRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `AnalyzeInvoiceRequest` | `analyzeInvoiceRequestSchema` | `src/models/analyze-invoice-request.ts` |
| `InvoiceDto` | `invoiceDtoSchema` | `src/models/invoice-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### delayDelivery

- **Signature**: `delayDelivery(request: Orders.DelayDeliveryRequestParams, options?: RequestOptions): ApiPromise<DeliveriesDelayResponse, Orders.DelayDeliveryError>`
- **Wire**: `POST /deliveries/{id}/delay`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `DeliveriesDelayResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.DelayDeliveryError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Orders.DelayDeliveryRequestParams` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `DelayDeliveryRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `DelayDeliveryRequest` | `delayDeliveryRequestSchema` | `src/models/delay-delivery-request.ts` |
| `DeliveriesDelayResponse` | `deliveriesDelayResponseSchema` | `src/models/deliveries-delay-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### getPurchaseOrder

- **Signature**: `getPurchaseOrder(request: Orders.GetPurchaseOrderRequest, options?: RequestOptions): ApiPromise<PurchaseOrderDto, Orders.GetPurchaseOrderError>`
- **Wire**: `GET /purchase-orders/{id}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `PurchaseOrderDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.GetPurchaseOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Orders.GetPurchaseOrderRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `PurchaseOrderDto` | `purchaseOrderDtoSchema` | `src/models/purchase-order-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listDeliveries

- **Signature**: `listDeliveries(options?: RequestOptions): ApiPromise<DeliveriesResponse, Orders.ListDeliveriesError>`
- **Wire**: `GET /deliveries`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `DeliveriesResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.ListDeliveriesError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `DeliveriesResponse` | `deliveriesResponseSchema` | `src/models/deliveries-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listInvoices

- **Signature**: `listInvoices(options?: RequestOptions): ApiPromise<InvoicesResponse, Orders.ListInvoicesError>`
- **Wire**: `GET /invoices`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `InvoicesResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.ListInvoicesError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `InvoicesResponse` | `invoicesResponseSchema` | `src/models/invoices-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listPurchaseOrders

- **Signature**: `listPurchaseOrders(options?: RequestOptions): ApiPromise<PurchaseOrdersResponse, Orders.ListPurchaseOrdersError>`
- **Wire**: `GET /purchase-orders`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `PurchaseOrdersResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.ListPurchaseOrdersError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `PurchaseOrdersResponse` | `purchaseOrdersResponseSchema` | `src/models/purchase-orders-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### receiveDelivery

- **Signature**: `receiveDelivery(request: Orders.ReceiveDeliveryRequestParams, options?: RequestOptions): ApiPromise<DeliveriesReceiveResponse, Orders.ReceiveDeliveryError>`
- **Wire**: `POST /deliveries/{id}/receive`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `DeliveriesReceiveResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Orders.ReceiveDeliveryError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [422] `ApiErrorModel` · `"apiErrorModel7"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Orders.ReceiveDeliveryRequestParams` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `ReceiveDeliveryRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ReceiveDeliveryRequest` | `receiveDeliveryRequestSchema` | `src/models/receive-delivery-request.ts` |
| `DeliveriesReceiveResponse` | `deliveriesReceiveResponseSchema` | `src/models/deliveries-receive-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

