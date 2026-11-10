<!-- Generated file — do not edit; regenerated with the SDK. -->

# System — operations

Accessor: `client.system` · Source: `quartermaster_ai_trust_rail_api/apis/system.py` · 2 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.system.get_public_config

- **Route**: `GET /config/public`
- **Signature**: `def get_public_config(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `PublicConfig`
- **Returns (raw)**: `ApiResult[PublicConfig, GetPublicConfigErrorBody]`
- **Error**: `GetPublicConfigErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `PublicConfig` | `quartermaster_ai_trust_rail_api/models/public_config.py` |
| `GetPublicConfigErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_public_config_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.system.report_client_error

- **Route**: `POST /client-errors`
- **Signature**: `def report_client_error(x_requested_with: XRequestedWithOrStr, body: ClientErrorReport | ClientErrorReportDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `ClientErrorsResponse`
- **Returns (raw)**: `ApiResult[ClientErrorsResponse, ReportClientErrorBody]`
- **Error**: `ReportClientErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ClientErrorReport` | `quartermaster_ai_trust_rail_api/models/client_error_report.py` |
| `ClientErrorReportDict` | `quartermaster_ai_trust_rail_api/models/client_error_report.py` |
| `ClientErrorsResponse` | `quartermaster_ai_trust_rail_api/models/client_errors_response.py` |
| `ReportClientErrorBody` | `quartermaster_ai_trust_rail_api/errors/report_client_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

