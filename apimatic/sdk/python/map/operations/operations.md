<!-- Generated file — do not edit; regenerated with the SDK. -->

# Operations — operations

Accessor: `client.operations` · Source: `quartermaster_ai_trust_rail_api/apis/operations.py` · 4 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.operations.get_platform_health

- **Route**: `GET /ops/health`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_platform_health(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `OpsHealthDto`
- **Returns (raw)**: `ApiResult[OpsHealthDto, GetPlatformHealthErrorBody]`
- **Error**: `GetPlatformHealthErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OpsHealthDto` | `quartermaster_ai_trust_rail_api/models/ops_health_dto.py` |
| `GetPlatformHealthErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_platform_health_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.operations.list_tracked_errors

- **Route**: `GET /ops/errors`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_tracked_errors(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `OpsErrorsResponse`
- **Returns (raw)**: `ApiResult[OpsErrorsResponse, ListTrackedErrorsErrorBody]`
- **Error**: `ListTrackedErrorsErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OpsErrorsResponse` | `quartermaster_ai_trust_rail_api/models/ops_errors_response.py` |
| `ListTrackedErrorsErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_tracked_errors_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.operations.resolve_tracked_error

- **Route**: `POST /ops/errors/{id}/resolve`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def resolve_tracked_error(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `OpsErrorsResolveResponse`
- **Returns (raw)**: `ApiResult[OpsErrorsResolveResponse, ResolveTrackedErrorBody]`
- **Error**: `ResolveTrackedErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `OpsErrorsResolveResponse` | `quartermaster_ai_trust_rail_api/models/ops_errors_resolve_response.py` |
| `ResolveTrackedErrorBody` | `quartermaster_ai_trust_rail_api/errors/resolve_tracked_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.operations.send_test_alert

- **Route**: `POST /ops/alerts/test`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def send_test_alert(x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`
- **Params**: `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `AlertTestResponse`
- **Returns (raw)**: `ApiResult[AlertTestResponse, SendTestAlertErrorBody]`
- **Error**: `SendTestAlertErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `AlertTestResponse` | `quartermaster_ai_trust_rail_api/models/alert_test_response.py` |
| `SendTestAlertErrorBody` | `quartermaster_ai_trust_rail_api/errors/send_test_alert_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

