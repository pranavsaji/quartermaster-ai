<!-- Generated file — do not edit; regenerated with the SDK. -->

# Procurement — operations

Accessor: `client.procurement` · Source: `src/resources/procurement.ts` · 7 operations · Request and error types: namespace `Procurement`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### approveProcurementRequest

- **Signature**: `approveProcurementRequest(request: Procurement.ApproveProcurementRequestRequest, options?: RequestOptions): ApiPromise<ProcurementRequestsApproveResponse, Procurement.ApproveProcurementRequestError>`
- **Wire**: `POST /procurement/requests/{id}/approve`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `ProcurementRequestsApproveResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.ApproveProcurementRequestError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [422] `ApiErrorModel` · `"apiErrorModel7"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Procurement.ApproveProcurementRequestRequest` (4):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `ApproveRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ApproveRequest` | `approveRequestSchema` | `src/models/approve-request.ts` |
| `ProcurementRequestsApproveResponse` | `procurementRequestsApproveResponseSchema` | `src/models/procurement-requests-approve-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### createProcurementRequest

- **Signature**: `createProcurementRequest(request: Procurement.CreateProcurementRequestRequest, options?: RequestOptions): ApiPromise<ProcurementRequestDto, Procurement.CreateProcurementRequestError>`
- **Wire**: `POST /procurement/requests`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `ProcurementRequestDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.CreateProcurementRequestError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [422] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Procurement.CreateProcurementRequestRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `CreateProcurementRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `CreateProcurementRequest` | `createProcurementRequestSchema` | `src/models/create-procurement-request.ts` |
| `ProcurementRequestDto` | `procurementRequestDtoSchema` | `src/models/procurement-request-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### evaluateProcurementRequest

- **Signature**: `evaluateProcurementRequest(request: Procurement.EvaluateProcurementRequestRequest, options?: RequestOptions): ApiPromise<ProcurementRequestDto, Procurement.EvaluateProcurementRequestError>`
- **Wire**: `POST /procurement/requests/{id}/evaluate`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ProcurementRequestDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.EvaluateProcurementRequestError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Procurement.EvaluateProcurementRequestRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ProcurementRequestDto` | `procurementRequestDtoSchema` | `src/models/procurement-request-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### getProcurementRequest

- **Signature**: `getProcurementRequest(request: Procurement.GetProcurementRequestRequest, options?: RequestOptions): ApiPromise<ProcurementRequestDto, Procurement.GetProcurementRequestError>`
- **Wire**: `GET /procurement/requests/{id}`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `ProcurementRequestDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.GetProcurementRequestError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Procurement.GetProcurementRequestRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `ProcurementRequestDto` | `procurementRequestDtoSchema` | `src/models/procurement-request-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listProcurementRequests

- **Signature**: `listProcurementRequests(options?: RequestOptions): ApiPromise<ProcurementRequestsResponse, Procurement.ListProcurementRequestsError>`
- **Wire**: `GET /procurement/requests`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `ProcurementRequestsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.ListProcurementRequestsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `ProcurementRequestsResponse` | `procurementRequestsResponseSchema` | `src/models/procurement-requests-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### rejectProcurementRequest

- **Signature**: `rejectProcurementRequest(request: Procurement.RejectProcurementRequestRequest, options?: RequestOptions): ApiPromise<ProcurementRequestDto, Procurement.RejectProcurementRequestError>`
- **Wire**: `POST /procurement/requests/{id}/reject`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ProcurementRequestDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.RejectProcurementRequestError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Procurement.RejectProcurementRequestRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `RejectRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `RejectRequest` | `rejectRequestSchema` | `src/models/reject-request.ts` |
| `ProcurementRequestDto` | `procurementRequestDtoSchema` | `src/models/procurement-request-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### researchProcurementRequest

- **Signature**: `researchProcurementRequest(request: Procurement.ResearchProcurementRequestRequest, options?: RequestOptions): ApiPromise<ProcurementRequestDto, Procurement.ResearchProcurementRequestError>`
- **Wire**: `POST /procurement/requests/{id}/research`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ProcurementRequestDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Procurement.ResearchProcurementRequestError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Procurement.ResearchProcurementRequestRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ProcurementRequestDto` | `procurementRequestDtoSchema` | `src/models/procurement-request-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

