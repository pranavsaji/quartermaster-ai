<!-- Generated file — do not edit; regenerated with the SDK. -->

# Analytics — operations

Accessor: `client.analytics` · Source: `quartermaster_ai_trust_rail_api/apis/analytics.py` · 1 operation

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.analytics.get_analytics_summary

- **Route**: `GET /analytics/summary`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_analytics_summary(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `AnalyticsSummaryDto`
- **Returns (raw)**: `ApiResult[AnalyticsSummaryDto, GetAnalyticsSummaryErrorBody]`
- **Error**: `GetAnalyticsSummaryErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `AnalyticsSummaryDto` | `quartermaster_ai_trust_rail_api/models/analytics_summary_dto.py` |
| `GetAnalyticsSummaryErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_analytics_summary_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

