<!-- Generated file — do not edit; regenerated with the SDK. -->

# SecurityApi — operations

Accessor: `client.securityApi` · Source: `src/resources/security-api.ts` · 5 operations · Request and error types: namespace `SecurityApi`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getPayPalNotificationStatus

- **Signature**: `getPayPalNotificationStatus(options?: RequestOptions): ApiPromise<SecurityPaypalNotificationsResponse, SecurityApi.GetPayPalNotificationStatusError>`
- **Wire**: `GET /security/paypal-notifications`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SecurityPaypalNotificationsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `SecurityApi.GetPayPalNotificationStatusError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `SecurityPaypalNotificationsResponse` | `securityPaypalNotificationsResponseSchema` | `src/models/security-paypal-notifications-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listAuditEvents

- **Signature**: `listAuditEvents(options?: RequestOptions): ApiPromise<SecurityAuditResponse, SecurityApi.ListAuditEventsError>`
- **Wire**: `GET /security/audit`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SecurityAuditResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `SecurityApi.ListAuditEventsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `SecurityAuditResponse` | `securityAuditResponseSchema` | `src/models/security-audit-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listPolicyDecisions

- **Signature**: `listPolicyDecisions(options?: RequestOptions): ApiPromise<SecurityDecisionsResponse, SecurityApi.ListPolicyDecisionsError>`
- **Wire**: `GET /security/decisions`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SecurityDecisionsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `SecurityApi.ListPolicyDecisionsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `SecurityDecisionsResponse` | `securityDecisionsResponseSchema` | `src/models/security-decisions-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listSecurityFindings

- **Signature**: `listSecurityFindings(options?: RequestOptions): ApiPromise<SecurityEventsResponse, SecurityApi.ListSecurityFindingsError>`
- **Wire**: `GET /security/events`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SecurityEventsResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `SecurityApi.ListSecurityFindingsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `SecurityEventsResponse` | `securityEventsResponseSchema` | `src/models/security-events-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### verifyAuditChain

- **Signature**: `verifyAuditChain(options?: RequestOptions): ApiPromise<AuditChainVerificationDto, SecurityApi.VerifyAuditChainError>`
- **Wire**: `GET /security/audit/verify`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `AuditChainVerificationDto`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `SecurityApi.VerifyAuditChainError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `AuditChainVerificationDto` | `auditChainVerificationDtoSchema` | `src/models/audit-chain-verification-dto.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

