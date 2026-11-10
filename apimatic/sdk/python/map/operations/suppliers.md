<!-- Generated file — do not edit; regenerated with the SDK. -->

# Suppliers — operations

Accessor: `client.suppliers` · Source: `quartermaster_ai_trust_rail_api/apis/suppliers.py` · 6 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.suppliers.create_catalog_item

- **Route**: `POST /suppliers/{id}/catalog`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def create_catalog_item(id_: UUID, x_requested_with: XRequestedWithOrStr, body: CatalogItemInput | CatalogItemInputDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `SuppliersCatalogResponse`
- **Returns (raw)**: `ApiResult[SuppliersCatalogResponse, CreateCatalogItemErrorBody]`
- **Error**: `CreateCatalogItemErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `CatalogItemInput` | `quartermaster_ai_trust_rail_api/models/catalog_item_input.py` |
| `CatalogItemInputDict` | `quartermaster_ai_trust_rail_api/models/catalog_item_input.py` |
| `SuppliersCatalogResponse` | `quartermaster_ai_trust_rail_api/models/suppliers_catalog_response.py` |
| `CreateCatalogItemErrorBody` | `quartermaster_ai_trust_rail_api/errors/create_catalog_item_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.suppliers.create_supplier

- **Route**: `POST /suppliers`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def create_supplier(x_requested_with: XRequestedWithOrStr, body: SupplierInput | SupplierInputDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `SuppliersResponse1`
- **Returns (raw)**: `ApiResult[SuppliersResponse1, CreateSupplierErrorBody]`
- **Error**: `CreateSupplierErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `SupplierInput` | `quartermaster_ai_trust_rail_api/models/supplier_input.py` |
| `SupplierInputDict` | `quartermaster_ai_trust_rail_api/models/supplier_input.py` |
| `SuppliersResponse1` | `quartermaster_ai_trust_rail_api/models/suppliers_response1.py` |
| `CreateSupplierErrorBody` | `quartermaster_ai_trust_rail_api/errors/create_supplier_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.suppliers.get_supplier

- **Route**: `GET /suppliers/{id}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_supplier(id_: UUID, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id`
- **Returns (parsed)**: `SuppliersResponse1`
- **Returns (raw)**: `ApiResult[SuppliersResponse1, GetSupplierErrorBody]`
- **Error**: `GetSupplierErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SuppliersResponse1` | `quartermaster_ai_trust_rail_api/models/suppliers_response1.py` |
| `GetSupplierErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_supplier_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.suppliers.list_suppliers

- **Route**: `GET /suppliers`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_suppliers(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `SuppliersResponse`
- **Returns (raw)**: `ApiResult[SuppliersResponse, ListSuppliersErrorBody]`
- **Error**: `ListSuppliersErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SuppliersResponse` | `quartermaster_ai_trust_rail_api/models/suppliers_response.py` |
| `ListSuppliersErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_suppliers_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.suppliers.update_catalog_item

- **Route**: `PUT /suppliers/{id}/catalog/{itemId}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def update_catalog_item(id_: UUID, item_id: UUID, x_requested_with: XRequestedWithOrStr, body: CatalogItemInput | CatalogItemInputDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `item_id`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `item_id` — path `itemId` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `SuppliersCatalogResponse`
- **Returns (raw)**: `ApiResult[SuppliersCatalogResponse, UpdateCatalogItemErrorBody]`
- **Error**: `UpdateCatalogItemErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `CatalogItemInput` | `quartermaster_ai_trust_rail_api/models/catalog_item_input.py` |
| `CatalogItemInputDict` | `quartermaster_ai_trust_rail_api/models/catalog_item_input.py` |
| `SuppliersCatalogResponse` | `quartermaster_ai_trust_rail_api/models/suppliers_catalog_response.py` |
| `UpdateCatalogItemErrorBody` | `quartermaster_ai_trust_rail_api/errors/update_catalog_item_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.suppliers.update_supplier

- **Route**: `PUT /suppliers/{id}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def update_supplier(id_: UUID, x_requested_with: XRequestedWithOrStr, body: SupplierInput | SupplierInputDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `SuppliersResponse1`
- **Returns (raw)**: `ApiResult[SuppliersResponse1, UpdateSupplierErrorBody]`
- **Error**: `UpdateSupplierErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `SupplierInput` | `quartermaster_ai_trust_rail_api/models/supplier_input.py` |
| `SupplierInputDict` | `quartermaster_ai_trust_rail_api/models/supplier_input.py` |
| `SuppliersResponse1` | `quartermaster_ai_trust_rail_api/models/suppliers_response1.py` |
| `UpdateSupplierErrorBody` | `quartermaster_ai_trust_rail_api/errors/update_supplier_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

