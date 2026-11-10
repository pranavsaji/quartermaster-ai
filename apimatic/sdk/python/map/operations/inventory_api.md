<!-- Generated file — do not edit; regenerated with the SDK. -->

# InventoryApi — operations

Accessor: `client.inventory_api` · Source: `quartermaster_ai_trust_rail_api/apis/inventory_api.py` · 5 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.inventory_api.adjust_inventory_item

- **Route**: `POST /inventory/{id}/adjustments`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def adjust_inventory_item(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: InventoryAdjustmentRequest | InventoryAdjustmentRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `idempotency_key`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `InventoryAdjustmentsResponse`
- **Returns (raw)**: `ApiResult[InventoryAdjustmentsResponse, AdjustInventoryItemErrorBody]`
- **Error**: `AdjustInventoryItemErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `InventoryAdjustmentRequest` | `quartermaster_ai_trust_rail_api/models/inventory_adjustment_request.py` |
| `InventoryAdjustmentRequestDict` | `quartermaster_ai_trust_rail_api/models/inventory_adjustment_request.py` |
| `InventoryAdjustmentsResponse` | `quartermaster_ai_trust_rail_api/models/inventory_adjustments_response.py` |
| `AdjustInventoryItemErrorBody` | `quartermaster_ai_trust_rail_api/errors/adjust_inventory_item_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.inventory_api.create_inventory_item

- **Route**: `POST /inventory`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def create_inventory_item(x_requested_with: XRequestedWithOrStr, body: CreateInventoryItemRequest | CreateInventoryItemRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `InventoryResponse1`
- **Returns (raw)**: `ApiResult[InventoryResponse1, CreateInventoryItemErrorBody]`
- **Error**: `CreateInventoryItemErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `CreateInventoryItemRequest` | `quartermaster_ai_trust_rail_api/models/create_inventory_item_request.py` |
| `CreateInventoryItemRequestDict` | `quartermaster_ai_trust_rail_api/models/create_inventory_item_request.py` |
| `InventoryResponse1` | `quartermaster_ai_trust_rail_api/models/inventory_response1.py` |
| `CreateInventoryItemErrorBody` | `quartermaster_ai_trust_rail_api/errors/create_inventory_item_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.inventory_api.forecast_inventory

- **Route**: `POST /inventory/forecast`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def forecast_inventory(x_requested_with: XRequestedWithOrStr, body: ForecastRequest | ForecastRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `ForecastRunDto`
- **Returns (raw)**: `ApiResult[ForecastRunDto, ForecastInventoryErrorBody]`
- **Error**: `ForecastInventoryErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ForecastRequest` | `quartermaster_ai_trust_rail_api/models/forecast_request.py` |
| `ForecastRequestDict` | `quartermaster_ai_trust_rail_api/models/forecast_request.py` |
| `ForecastRunDto` | `quartermaster_ai_trust_rail_api/models/forecast_run_dto.py` |
| `ForecastInventoryErrorBody` | `quartermaster_ai_trust_rail_api/errors/forecast_inventory_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.inventory_api.list_inventory

- **Route**: `GET /inventory`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_inventory(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `InventoryResponse`
- **Returns (raw)**: `ApiResult[InventoryResponse, ListInventoryErrorBody]`
- **Error**: `ListInventoryErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `InventoryResponse` | `quartermaster_ai_trust_rail_api/models/inventory_response.py` |
| `ListInventoryErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_inventory_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.inventory_api.update_inventory_item

- **Route**: `PUT /inventory/{id}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def update_inventory_item(id_: UUID, x_requested_with: XRequestedWithOrStr, body: InventoryItemInput | InventoryItemInputDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `InventoryResponse1`
- **Returns (raw)**: `ApiResult[InventoryResponse1, UpdateInventoryItemErrorBody]`
- **Error**: `UpdateInventoryItemErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `InventoryItemInput` | `quartermaster_ai_trust_rail_api/models/inventory_item_input.py` |
| `InventoryItemInputDict` | `quartermaster_ai_trust_rail_api/models/inventory_item_input.py` |
| `InventoryResponse1` | `quartermaster_ai_trust_rail_api/models/inventory_response1.py` |
| `UpdateInventoryItemErrorBody` | `quartermaster_ai_trust_rail_api/errors/update_inventory_item_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

