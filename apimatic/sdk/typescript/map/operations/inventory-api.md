<!-- Generated file — do not edit; regenerated with the SDK. -->

# InventoryApi — operations

Accessor: `client.inventoryApi` · Source: `src/resources/inventory-api.ts` · 5 operations · Request and error types: namespace `InventoryApi`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### adjustInventoryItem

- **Signature**: `adjustInventoryItem(request: InventoryApi.AdjustInventoryItemRequest, options?: RequestOptions): ApiPromise<InventoryAdjustmentsResponse, InventoryApi.AdjustInventoryItemError>`
- **Wire**: `POST /inventory/{id}/adjustments`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `InventoryAdjustmentsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `InventoryApi.AdjustInventoryItemError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [422] `ApiErrorModel` · `"apiErrorModel7"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `InventoryApi.AdjustInventoryItemRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `InventoryAdjustmentRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `InventoryAdjustmentRequest` | `inventoryAdjustmentRequestSchema` | `src/models/inventory-adjustment-request.ts` |
| `InventoryAdjustmentsResponse` | `inventoryAdjustmentsResponseSchema` | `src/models/inventory-adjustments-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### createInventoryItem

- **Signature**: `createInventoryItem(request: InventoryApi.CreateInventoryItemRequestParams, options?: RequestOptions): ApiPromise<InventoryResponse1, InventoryApi.CreateInventoryItemError>`
- **Wire**: `POST /inventory`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `InventoryResponse1`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `InventoryApi.CreateInventoryItemError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `InventoryApi.CreateInventoryItemRequestParams` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `CreateInventoryItemRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `CreateInventoryItemRequest` | `createInventoryItemRequestSchema` | `src/models/create-inventory-item-request.ts` |
| `InventoryResponse1` | `inventoryResponse1Schema` | `src/models/inventory-response1.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### forecastInventory

- **Signature**: `forecastInventory(request: InventoryApi.ForecastInventoryRequest, options?: RequestOptions): ApiPromise<ForecastRunDto, InventoryApi.ForecastInventoryError>`
- **Wire**: `POST /inventory/forecast`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ForecastRunDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `InventoryApi.ForecastInventoryError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `InventoryApi.ForecastInventoryRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `ForecastRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ForecastRequest` | `forecastRequestSchema` | `src/models/forecast-request.ts` |
| `ForecastRunDto` | `forecastRunDtoSchema` | `src/models/forecast-run-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listInventory

- **Signature**: `listInventory(options?: RequestOptions): ApiPromise<InventoryResponse, InventoryApi.ListInventoryError>`
- **Wire**: `GET /inventory`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `InventoryResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `InventoryApi.ListInventoryError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `InventoryResponse` | `inventoryResponseSchema` | `src/models/inventory-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### updateInventoryItem

- **Signature**: `updateInventoryItem(request: InventoryApi.UpdateInventoryItemRequest, options?: RequestOptions): ApiPromise<InventoryResponse1, InventoryApi.UpdateInventoryItemError>`
- **Wire**: `PUT /inventory/{id}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `InventoryResponse1`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `InventoryApi.UpdateInventoryItemError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `InventoryApi.UpdateInventoryItemRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `InventoryItemInput` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `InventoryItemInput` | `inventoryItemInputSchema` | `src/models/inventory-item-input.ts` |
| `InventoryResponse1` | `inventoryResponse1Schema` | `src/models/inventory-response1.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

