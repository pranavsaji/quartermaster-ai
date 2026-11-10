<!-- Generated file — do not edit; regenerated with the SDK. -->

# AccountsApi — operations

Accessor: `client.accounts_api` · Source: `quartermaster_ai_trust_rail_api/apis/accounts_api.py` · 7 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.accounts_api.change_password

- **Route**: `POST /auth/password/change`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def change_password(x_requested_with: XRequestedWithOrStr, body: ChangePasswordRequest | ChangePasswordRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `AuthPasswordChangeResponse`
- **Returns (raw)**: `ApiResult[AuthPasswordChangeResponse, ChangePasswordErrorBody]`
- **Error**: `ChangePasswordErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ChangePasswordRequest` | `quartermaster_ai_trust_rail_api/models/change_password_request.py` |
| `ChangePasswordRequestDict` | `quartermaster_ai_trust_rail_api/models/change_password_request.py` |
| `AuthPasswordChangeResponse` | `quartermaster_ai_trust_rail_api/models/auth_password_change_response.py` |
| `ChangePasswordErrorBody` | `quartermaster_ai_trust_rail_api/errors/change_password_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.accounts_api.get_current_user

- **Route**: `GET /auth/me`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_current_user(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `AuthMeResponse`
- **Returns (raw)**: `ApiResult[AuthMeResponse, GetCurrentUserErrorBody]`
- **Error**: `GetCurrentUserErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `AuthMeResponse` | `quartermaster_ai_trust_rail_api/models/auth_me_response.py` |
| `GetCurrentUserErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_current_user_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.accounts_api.login

- **Route**: `POST /auth/login`
- **Signature**: `def login(x_requested_with: XRequestedWithOrStr, body: LoginRequest | LoginRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `AuthLoginResponse`
- **Returns (raw)**: `ApiResult[AuthLoginResponse, LoginErrorBody]`
- **Error**: `LoginErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `LoginRequest` | `quartermaster_ai_trust_rail_api/models/login_request.py` |
| `LoginRequestDict` | `quartermaster_ai_trust_rail_api/models/login_request.py` |
| `AuthLoginResponse` | `quartermaster_ai_trust_rail_api/models/auth_login_response.py` |
| `LoginErrorBody` | `quartermaster_ai_trust_rail_api/errors/login_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.accounts_api.logout

- **Route**: `POST /auth/logout`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def logout(x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`
- **Params**: `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `None`
- **Returns (raw)**: `ApiResult[None, LogoutErrorBody]`
- **Error**: `LogoutErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `LogoutErrorBody` | `quartermaster_ai_trust_rail_api/errors/logout_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.accounts_api.request_password_reset

- **Route**: `POST /auth/password/forgot`
- **Signature**: `def request_password_reset(x_requested_with: XRequestedWithOrStr, body: ForgotPasswordRequest | ForgotPasswordRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `AuthPasswordForgotResponse`
- **Returns (raw)**: `ApiResult[AuthPasswordForgotResponse, RequestPasswordResetErrorBody]`
- **Error**: `RequestPasswordResetErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ForgotPasswordRequest` | `quartermaster_ai_trust_rail_api/models/forgot_password_request.py` |
| `ForgotPasswordRequestDict` | `quartermaster_ai_trust_rail_api/models/forgot_password_request.py` |
| `AuthPasswordForgotResponse` | `quartermaster_ai_trust_rail_api/models/auth_password_forgot_response.py` |
| `RequestPasswordResetErrorBody` | `quartermaster_ai_trust_rail_api/errors/request_password_reset_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.accounts_api.reset_password

- **Route**: `POST /auth/password/reset`
- **Signature**: `def reset_password(x_requested_with: XRequestedWithOrStr, body: ResetPasswordRequest | ResetPasswordRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `AuthPasswordResetResponse`
- **Returns (raw)**: `ApiResult[AuthPasswordResetResponse, ResetPasswordErrorBody]`
- **Error**: `ResetPasswordErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ResetPasswordRequest` | `quartermaster_ai_trust_rail_api/models/reset_password_request.py` |
| `ResetPasswordRequestDict` | `quartermaster_ai_trust_rail_api/models/reset_password_request.py` |
| `AuthPasswordResetResponse` | `quartermaster_ai_trust_rail_api/models/auth_password_reset_response.py` |
| `ResetPasswordErrorBody` | `quartermaster_ai_trust_rail_api/errors/reset_password_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.accounts_api.signup

- **Route**: `POST /auth/signup`
- **Signature**: `def signup(x_requested_with: XRequestedWithOrStr, body: SignupRequest | SignupRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `AuthSignupResponse`
- **Returns (raw)**: `ApiResult[AuthSignupResponse, SignupErrorBody]`
- **Error**: `SignupErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `SignupRequest` | `quartermaster_ai_trust_rail_api/models/signup_request.py` |
| `SignupRequestDict` | `quartermaster_ai_trust_rail_api/models/signup_request.py` |
| `AuthSignupResponse` | `quartermaster_ai_trust_rail_api/models/auth_signup_response.py` |
| `SignupErrorBody` | `quartermaster_ai_trust_rail_api/errors/signup_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

