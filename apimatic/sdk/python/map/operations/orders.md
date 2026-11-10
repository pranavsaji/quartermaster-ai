<!-- Generated file — do not edit; regenerated with the SDK. -->

# Orders — operations

Accessor: `client.orders` · Source: `quartermaster_ai_trust_rail_api/apis/orders.py` · 7 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.orders.analyze_invoice

- **Route**: `POST /invoices/analyze`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def analyze_invoice(x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `idempotency_key`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `InvoiceDto`
- **Returns (raw)**: `ApiResult[InvoiceDto, AnalyzeInvoiceErrorBody]`
- **Error**: `AnalyzeInvoiceErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `AnalyzeInvoiceRequest` | `quartermaster_ai_trust_rail_api/models/analyze_invoice_request.py` |
| `AnalyzeInvoiceRequestDict` | `quartermaster_ai_trust_rail_api/models/analyze_invoice_request.py` |
| `InvoiceDto` | `quartermaster_ai_trust_rail_api/models/invoice_dto.py` |
| `AnalyzeInvoiceErrorBody` | `quartermaster_ai_trust_rail_api/errors/analyze_invoice_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.orders.delay_delivery

- **Route**: `POST /deliveries/{id}/delay`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def delay_delivery(id_: UUID, x_requested_with: XRequestedWithOrStr, body: DelayDeliveryRequest | DelayDeliveryRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `DeliveriesDelayResponse`
- **Returns (raw)**: `ApiResult[DeliveriesDelayResponse, DelayDeliveryErrorBody]`
- **Error**: `DelayDeliveryErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `DelayDeliveryRequest` | `quartermaster_ai_trust_rail_api/models/delay_delivery_request.py` |
| `DelayDeliveryRequestDict` | `quartermaster_ai_trust_rail_api/models/delay_delivery_request.py` |
| `DeliveriesDelayResponse` | `quartermaster_ai_trust_rail_api/models/deliveries_delay_response.py` |
| `DelayDeliveryErrorBody` | `quartermaster_ai_trust_rail_api/errors/delay_delivery_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.orders.get_purchase_order

- **Route**: `GET /purchase-orders/{id}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_purchase_order(id_: UUID, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id`
- **Returns (parsed)**: `PurchaseOrderDto`
- **Returns (raw)**: `ApiResult[PurchaseOrderDto, GetPurchaseOrderErrorBody]`
- **Error**: `GetPurchaseOrderErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `PurchaseOrderDto` | `quartermaster_ai_trust_rail_api/models/purchase_order_dto.py` |
| `GetPurchaseOrderErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_purchase_order_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.orders.list_deliveries

- **Route**: `GET /deliveries`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_deliveries(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `DeliveriesResponse`
- **Returns (raw)**: `ApiResult[DeliveriesResponse, ListDeliveriesErrorBody]`
- **Error**: `ListDeliveriesErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `DeliveriesResponse` | `quartermaster_ai_trust_rail_api/models/deliveries_response.py` |
| `ListDeliveriesErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_deliveries_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.orders.list_invoices

- **Route**: `GET /invoices`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_invoices(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `InvoicesResponse`
- **Returns (raw)**: `ApiResult[InvoicesResponse, ListInvoicesErrorBody]`
- **Error**: `ListInvoicesErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `InvoicesResponse` | `quartermaster_ai_trust_rail_api/models/invoices_response.py` |
| `ListInvoicesErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_invoices_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.orders.list_purchase_orders

- **Route**: `GET /purchase-orders`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_purchase_orders(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `PurchaseOrdersResponse`
- **Returns (raw)**: `ApiResult[PurchaseOrdersResponse, ListPurchaseOrdersErrorBody]`
- **Error**: `ListPurchaseOrdersErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `PurchaseOrdersResponse` | `quartermaster_ai_trust_rail_api/models/purchase_orders_response.py` |
| `ListPurchaseOrdersErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_purchase_orders_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.orders.receive_delivery

- **Route**: `POST /deliveries/{id}/receive`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def receive_delivery(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: ReceiveDeliveryRequest | ReceiveDeliveryRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `idempotency_key`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `DeliveriesReceiveResponse`
- **Returns (raw)**: `ApiResult[DeliveriesReceiveResponse, ReceiveDeliveryErrorBody]`
- **Error**: `ReceiveDeliveryErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ReceiveDeliveryRequest` | `quartermaster_ai_trust_rail_api/models/receive_delivery_request.py` |
| `ReceiveDeliveryRequestDict` | `quartermaster_ai_trust_rail_api/models/receive_delivery_request.py` |
| `DeliveriesReceiveResponse` | `quartermaster_ai_trust_rail_api/models/deliveries_receive_response.py` |
| `ReceiveDeliveryErrorBody` | `quartermaster_ai_trust_rail_api/errors/receive_delivery_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

