<!-- Generated file — do not edit; regenerated with the SDK. -->

# Procurement — operations

Accessor: `client.procurement` · Source: `quartermaster_ai_trust_rail_api/apis/procurement.py` · 7 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.procurement.approve_procurement_request

- **Route**: `POST /procurement/requests/{id}/approve`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def approve_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: ApproveRequest | ApproveRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `idempotency_key`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `ProcurementRequestsApproveResponse`
- **Returns (raw)**: `ApiResult[ProcurementRequestsApproveResponse, ApproveProcurementRequestErrorBody]`
- **Error**: `ApproveProcurementRequestErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ApproveRequest` | `quartermaster_ai_trust_rail_api/models/approve_request.py` |
| `ApproveRequestDict` | `quartermaster_ai_trust_rail_api/models/approve_request.py` |
| `ProcurementRequestsApproveResponse` | `quartermaster_ai_trust_rail_api/models/procurement_requests_approve_response.py` |
| `ApproveProcurementRequestErrorBody` | `quartermaster_ai_trust_rail_api/errors/approve_procurement_request_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.procurement.create_procurement_request

- **Route**: `POST /procurement/requests`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def create_procurement_request(x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: CreateProcurementRequest | CreateProcurementRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `idempotency_key`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `ProcurementRequestDto`
- **Returns (raw)**: `ApiResult[ProcurementRequestDto, CreateProcurementRequestErrorBody]`
- **Error**: `CreateProcurementRequestErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `CreateProcurementRequest` | `quartermaster_ai_trust_rail_api/models/create_procurement_request.py` |
| `CreateProcurementRequestDict` | `quartermaster_ai_trust_rail_api/models/create_procurement_request.py` |
| `ProcurementRequestDto` | `quartermaster_ai_trust_rail_api/models/procurement_request_dto.py` |
| `CreateProcurementRequestErrorBody` | `quartermaster_ai_trust_rail_api/errors/create_procurement_request_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.procurement.evaluate_procurement_request

- **Route**: `POST /procurement/requests/{id}/evaluate`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def evaluate_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `ProcurementRequestDto`
- **Returns (raw)**: `ApiResult[ProcurementRequestDto, EvaluateProcurementRequestErrorBody]`
- **Error**: `EvaluateProcurementRequestErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ProcurementRequestDto` | `quartermaster_ai_trust_rail_api/models/procurement_request_dto.py` |
| `EvaluateProcurementRequestErrorBody` | `quartermaster_ai_trust_rail_api/errors/evaluate_procurement_request_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.procurement.get_procurement_request

- **Route**: `GET /procurement/requests/{id}`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_procurement_request(id_: UUID, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id`
- **Returns (parsed)**: `ProcurementRequestDto`
- **Returns (raw)**: `ApiResult[ProcurementRequestDto, GetProcurementRequestErrorBody]`
- **Error**: `GetProcurementRequestErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ProcurementRequestDto` | `quartermaster_ai_trust_rail_api/models/procurement_request_dto.py` |
| `GetProcurementRequestErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_procurement_request_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.procurement.list_procurement_requests

- **Route**: `GET /procurement/requests`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_procurement_requests(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `ProcurementRequestsResponse`
- **Returns (raw)**: `ApiResult[ProcurementRequestsResponse, ListProcurementRequestsErrorBody]`
- **Error**: `ListProcurementRequestsErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ProcurementRequestsResponse` | `quartermaster_ai_trust_rail_api/models/procurement_requests_response.py` |
| `ListProcurementRequestsErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_procurement_requests_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.procurement.reject_procurement_request

- **Route**: `POST /procurement/requests/{id}/reject`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def reject_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, body: RejectRequest | RejectRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `ProcurementRequestDto`
- **Returns (raw)**: `ApiResult[ProcurementRequestDto, RejectProcurementRequestErrorBody]`
- **Error**: `RejectProcurementRequestErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `RejectRequest` | `quartermaster_ai_trust_rail_api/models/reject_request.py` |
| `RejectRequestDict` | `quartermaster_ai_trust_rail_api/models/reject_request.py` |
| `ProcurementRequestDto` | `quartermaster_ai_trust_rail_api/models/procurement_request_dto.py` |
| `RejectProcurementRequestErrorBody` | `quartermaster_ai_trust_rail_api/errors/reject_procurement_request_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.procurement.research_procurement_request

- **Route**: `POST /procurement/requests/{id}/research`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def research_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `ProcurementRequestDto`
- **Returns (raw)**: `ApiResult[ProcurementRequestDto, ResearchProcurementRequestErrorBody]`
- **Error**: `ResearchProcurementRequestErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ProcurementRequestDto` | `quartermaster_ai_trust_rail_api/models/procurement_request_dto.py` |
| `ResearchProcurementRequestErrorBody` | `quartermaster_ai_trust_rail_api/errors/research_procurement_request_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

