<!-- Generated file — do not edit; regenerated with the SDK. -->

# TrustRail — operations

Accessor: `client.trustRail` · Source: `src/resources/trust-rail.ts` · 3 operations · Request and error types: namespace `TrustRail`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getSpendMandate

- **Signature**: `getSpendMandate(options?: RequestOptions): ApiPromise<MandatesCurrentResponse, TrustRail.GetSpendMandateError>`
- **Wire**: `GET /mandates/current`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `MandatesCurrentResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `TrustRail.GetSpendMandateError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `MandatesCurrentResponse` | `mandatesCurrentResponseSchema` | `src/models/mandates-current-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### updateSpendMandate

- **Signature**: `updateSpendMandate(request: TrustRail.UpdateSpendMandateRequest, options?: RequestOptions): ApiPromise<MandateUpdateResponse, TrustRail.UpdateSpendMandateError>`
- **Wire**: `PUT /mandates/current`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **Returns**: `MandateUpdateResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `TrustRail.UpdateSpendMandateError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [422] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `TrustRail.UpdateSpendMandateRequest` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `idempotencyKey` | `header` | `Idempotency-Key` | `string` | yes |
| `body` | `body` | — | `SpendMandateInput` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `SpendMandateInput` | `spendMandateInputSchema` | `src/models/spend-mandate-input.ts` |
| `MandateUpdateResponse` | `mandateUpdateResponseSchema` | `src/models/mandate-update-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### verifyIntentCertificate

- **Signature**: `verifyIntentCertificate(request: TrustRail.VerifyIntentCertificateRequest, options?: RequestOptions): ApiPromise<CertificateVerificationDto, TrustRail.VerifyIntentCertificateError>`
- **Wire**: `GET /intents/{id}/verify`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `CertificateVerificationDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `TrustRail.VerifyIntentCertificateError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `TrustRail.VerifyIntentCertificateRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `CertificateVerificationDto` | `certificateVerificationDtoSchema` | `src/models/certificate-verification-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

