<!-- Generated file — do not edit; regenerated with the SDK. -->

# Suppliers — operations

Accessor: `client.suppliers` · Source: `src/resources/suppliers.ts` · 6 operations · Request and error types: namespace `Suppliers`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### createCatalogItem

- **Signature**: `createCatalogItem(request: Suppliers.CreateCatalogItemRequest, options?: RequestOptions): ApiPromise<SuppliersCatalogResponse, Suppliers.CreateCatalogItemError>`
- **Wire**: `POST /suppliers/{id}/catalog`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `SuppliersCatalogResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Suppliers.CreateCatalogItemError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Suppliers.CreateCatalogItemRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `CatalogItemInput` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `CatalogItemInput` | `catalogItemInputSchema` | `src/models/catalog-item-input.ts` |
| `SuppliersCatalogResponse` | `suppliersCatalogResponseSchema` | `src/models/suppliers-catalog-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### createSupplier

- **Signature**: `createSupplier(request: Suppliers.CreateSupplierRequest, options?: RequestOptions): ApiPromise<SuppliersResponse1, Suppliers.CreateSupplierError>`
- **Wire**: `POST /suppliers`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `SuppliersResponse1`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Suppliers.CreateSupplierError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Suppliers.CreateSupplierRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `SupplierInput` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `SupplierInput` | `supplierInputSchema` | `src/models/supplier-input.ts` |
| `SuppliersResponse1` | `suppliersResponse1Schema` | `src/models/suppliers-response1.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### getSupplier

- **Signature**: `getSupplier(request: Suppliers.GetSupplierRequest, options?: RequestOptions): ApiPromise<SuppliersResponse1, Suppliers.GetSupplierError>`
- **Wire**: `GET /suppliers/{id}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SuppliersResponse1`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Suppliers.GetSupplierError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Suppliers.GetSupplierRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `SuppliersResponse1` | `suppliersResponse1Schema` | `src/models/suppliers-response1.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listSuppliers

- **Signature**: `listSuppliers(options?: RequestOptions): ApiPromise<SuppliersResponse, Suppliers.ListSuppliersError>`
- **Wire**: `GET /suppliers`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SuppliersResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Suppliers.ListSuppliersError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `SuppliersResponse` | `suppliersResponseSchema` | `src/models/suppliers-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### updateCatalogItem

- **Signature**: `updateCatalogItem(request: Suppliers.UpdateCatalogItemRequest, options?: RequestOptions): ApiPromise<SuppliersCatalogResponse, Suppliers.UpdateCatalogItemError>`
- **Wire**: `PUT /suppliers/{id}/catalog/{itemId}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `SuppliersCatalogResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Suppliers.UpdateCatalogItemError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Suppliers.UpdateCatalogItemRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `itemId` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `CatalogItemInput` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `CatalogItemInput` | `catalogItemInputSchema` | `src/models/catalog-item-input.ts` |
| `SuppliersCatalogResponse` | `suppliersCatalogResponseSchema` | `src/models/suppliers-catalog-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### updateSupplier

- **Signature**: `updateSupplier(request: Suppliers.UpdateSupplierRequest, options?: RequestOptions): ApiPromise<SuppliersResponse1, Suppliers.UpdateSupplierError>`
- **Wire**: `PUT /suppliers/{id}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `SuppliersResponse1`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Suppliers.UpdateSupplierError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Suppliers.UpdateSupplierRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `SupplierInput` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `SupplierInput` | `supplierInputSchema` | `src/models/supplier-input.ts` |
| `SuppliersResponse1` | `suppliersResponse1Schema` | `src/models/suppliers-response1.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

