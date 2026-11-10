<!-- Generated file — do not edit; regenerated with the SDK. -->

# System — operations

Accessor: `client.system` · Source: `src/resources/system.ts` · 2 operations · Request and error types: namespace `System`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getPublicConfig

- **Signature**: `getPublicConfig(options?: RequestOptions): ApiPromise<PublicConfig, System.GetPublicConfigError>`
- **Wire**: `GET /config/public`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `PublicConfig`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `System.GetPublicConfigError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `PublicConfig` | `publicConfigSchema` | `src/models/public-config.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### reportClientError

- **Signature**: `reportClientError(request: System.ReportClientErrorRequest, options?: RequestOptions): ApiPromise<ClientErrorsResponse, System.ReportClientErrorError>`
- **Wire**: `POST /client-errors`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ClientErrorsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `System.ReportClientErrorError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `System.ReportClientErrorRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `ClientErrorReport` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ClientErrorReport` | `clientErrorReportSchema` | `src/models/client-error-report.ts` |
| `ClientErrorsResponse` | `clientErrorsResponseSchema` | `src/models/client-errors-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

