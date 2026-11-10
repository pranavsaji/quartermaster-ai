<!-- Generated file — do not edit; regenerated with the SDK. -->

# Operations — operations

Accessor: `client.operations` · Source: `src/resources/operations.ts` · 4 operations · Request and error types: namespace `Operations`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getPlatformHealth

- **Signature**: `getPlatformHealth(options?: RequestOptions): ApiPromise<OpsHealthDto, Operations.GetPlatformHealthError>`
- **Wire**: `GET /ops/health`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `OpsHealthDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Operations.GetPlatformHealthError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `OpsHealthDto` | `opsHealthDtoSchema` | `src/models/ops-health-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listTrackedErrors

- **Signature**: `listTrackedErrors(options?: RequestOptions): ApiPromise<OpsErrorsResponse, Operations.ListTrackedErrorsError>`
- **Wire**: `GET /ops/errors`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `OpsErrorsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Operations.ListTrackedErrorsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `OpsErrorsResponse` | `opsErrorsResponseSchema` | `src/models/ops-errors-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### resolveTrackedError

- **Signature**: `resolveTrackedError(request: Operations.ResolveTrackedErrorRequest, options?: RequestOptions): ApiPromise<OpsErrorsResolveResponse, Operations.ResolveTrackedErrorError>`
- **Wire**: `POST /ops/errors/{id}/resolve`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `OpsErrorsResolveResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Operations.ResolveTrackedErrorError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Operations.ResolveTrackedErrorRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `OpsErrorsResolveResponse` | `opsErrorsResolveResponseSchema` | `src/models/ops-errors-resolve-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### sendTestAlert

- **Signature**: `sendTestAlert(request: Operations.SendTestAlertRequest, options?: RequestOptions): ApiPromise<AlertTestResponse, Operations.SendTestAlertError>`
- **Wire**: `POST /ops/alerts/test`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AlertTestResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Operations.SendTestAlertError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [409] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Operations.SendTestAlertRequest` (1):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `AlertTestResponse` | `alertTestResponseSchema` | `src/models/alert-test-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

