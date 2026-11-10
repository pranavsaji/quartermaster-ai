<!-- Generated file — do not edit; regenerated with the SDK. -->

# Analytics — operations

Accessor: `client.analytics` · Source: `src/resources/analytics.ts` · 1 operation · Request and error types: namespace `Analytics`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getAnalyticsSummary

- **Signature**: `getAnalyticsSummary(options?: RequestOptions): ApiPromise<AnalyticsSummaryDto, Analytics.GetAnalyticsSummaryError>`
- **Wire**: `GET /analytics/summary`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `AnalyticsSummaryDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Analytics.GetAnalyticsSummaryError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `AnalyticsSummaryDto` | `analyticsSummaryDtoSchema` | `src/models/analytics-summary-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

