<!-- Generated file — do not edit; regenerated with the SDK. -->

# AccountsApi — operations

Accessor: `client.accountsApi` · Source: `src/resources/accounts-api.ts` · 7 operations · Request and error types: namespace `AccountsApi`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### changePassword

- **Signature**: `changePassword(request: AccountsApi.ChangePasswordRequestParams, options?: RequestOptions): ApiPromise<AuthPasswordChangeResponse, AccountsApi.ChangePasswordError>`
- **Wire**: `POST /auth/password/change`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AuthPasswordChangeResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.ChangePasswordError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `AccountsApi.ChangePasswordRequestParams` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `ChangePasswordRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ChangePasswordRequest` | `changePasswordRequestSchema` | `src/models/change-password-request.ts` |
| `AuthPasswordChangeResponse` | `authPasswordChangeResponseSchema` | `src/models/auth-password-change-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### getCurrentUser

- **Signature**: `getCurrentUser(options?: RequestOptions): ApiPromise<AuthMeResponse, AccountsApi.GetCurrentUserError>`
- **Wire**: `GET /auth/me`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `AuthMeResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.GetCurrentUserError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `AuthMeResponse` | `authMeResponseSchema` | `src/models/auth-me-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### login

- **Signature**: `login(request: AccountsApi.LoginRequestParams, options?: RequestOptions): ApiPromise<AuthLoginResponse, AccountsApi.LoginError>`
- **Wire**: `POST /auth/login`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AuthLoginResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.LoginError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `AccountsApi.LoginRequestParams` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `LoginRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `LoginRequest` | `loginRequestSchema` | `src/models/login-request.ts` |
| `AuthLoginResponse` | `authLoginResponseSchema` | `src/models/auth-login-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### logout

- **Signature**: `logout(request: AccountsApi.LogoutRequest, options?: RequestOptions): ApiPromise<undefined, AccountsApi.LogoutError>`
- **Wire**: `POST /auth/logout`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `undefined` — the operation resolves to nothing
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.LogoutError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [409] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `AccountsApi.LogoutRequest` (1):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### requestPasswordReset

- **Signature**: `requestPasswordReset(request: AccountsApi.RequestPasswordResetRequest, options?: RequestOptions): ApiPromise<AuthPasswordForgotResponse, AccountsApi.RequestPasswordResetError>`
- **Wire**: `POST /auth/password/forgot`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AuthPasswordForgotResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.RequestPasswordResetError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `AccountsApi.RequestPasswordResetRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `ForgotPasswordRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ForgotPasswordRequest` | `forgotPasswordRequestSchema` | `src/models/forgot-password-request.ts` |
| `AuthPasswordForgotResponse` | `authPasswordForgotResponseSchema` | `src/models/auth-password-forgot-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### resetPassword

- **Signature**: `resetPassword(request: AccountsApi.ResetPasswordRequestParams, options?: RequestOptions): ApiPromise<AuthPasswordResetResponse, AccountsApi.ResetPasswordError>`
- **Wire**: `POST /auth/password/reset`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AuthPasswordResetResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.ResetPasswordError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `AccountsApi.ResetPasswordRequestParams` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `ResetPasswordRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ResetPasswordRequest` | `resetPasswordRequestSchema` | `src/models/reset-password-request.ts` |
| `AuthPasswordResetResponse` | `authPasswordResetResponseSchema` | `src/models/auth-password-reset-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### signup

- **Signature**: `signup(request: AccountsApi.SignupRequestParams, options?: RequestOptions): ApiPromise<AuthSignupResponse, AccountsApi.SignupError>`
- **Wire**: `POST /auth/signup`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AuthSignupResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `AccountsApi.SignupError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `AccountsApi.SignupRequestParams` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `SignupRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `SignupRequest` | `signupRequestSchema` | `src/models/signup-request.ts` |
| `AuthSignupResponse` | `authSignupResponseSchema` | `src/models/auth-signup-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

