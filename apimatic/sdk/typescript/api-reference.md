# Reference

> Source: [QuartermasterAiTrustRailApiClient](src/client.ts)

## System

> Source: [System](src/resources/system.ts)

<details>
<summary><code>getPublicConfig(options?: RequestOptions): ApiPromise&lt;PublicConfig, System.GetPublicConfigError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Feature flags and PayPal client id.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.system.getPublicConfig();
  // TODO: Handle 'response' of type PublicConfig
} catch (err) {
  // TODO: Handle 'err' of type System.GetPublicConfigError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.system.getPublicConfig().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PublicConfig
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.system.getPublicConfig()`

- **OnSuccess**: <code>[PublicConfig](src/models/public-config.ts)</code>
- **OnError**: throws <code>[System.GetPublicConfigError](src/resources/system.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.system.getPublicConfig().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PublicConfig, System.GetPublicConfigError&gt;</code>, with `result.value` of type <code>[PublicConfig](src/models/public-config.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>reportClientError(request: System.ReportClientErrorRequest, options?: RequestOptions): ApiPromise&lt;ClientErrorsResponse, System.ReportClientErrorError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Report a browser error to error tracking.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.system.reportClientError({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { message: "TypeError: x is undefined", path: "/orders", kind: Kind.Render },
  });
  // TODO: Handle 'response' of type ClientErrorsResponse
} catch (err) {
  // TODO: Handle 'err' of type System.ReportClientErrorError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.system.reportClientError({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { message: "TypeError: x is undefined", path: "/orders", kind: Kind.Render },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ClientErrorsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ClientErrorReport](src/models/client-error-report.ts)</code> | A browser error reported for error tracking. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.system.reportClientError(request)`

- **OnSuccess**: <code>[ClientErrorsResponse](src/models/client-errors-response.ts)</code>
- **OnError**: throws <code>[System.ReportClientErrorError](src/resources/system.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.system.reportClientError(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ClientErrorsResponse, System.ReportClientErrorError&gt;</code>, with `result.value` of type <code>[ClientErrorsResponse](src/models/client-errors-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## AccountsApi

> Source: [AccountsApi](src/resources/accounts-api.ts)

<details>
<summary><code>changePassword(request: AccountsApi.ChangePasswordRequestParams, options?: RequestOptions): ApiPromise&lt;AuthPasswordChangeResponse, AccountsApi.ChangePasswordError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Change your password (signs out other sessions).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.accountsApi.changePassword({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { currentPassword: "correct-horse-battery-staple", newPassword: "a-new-strong-passphrase" },
  });
  // TODO: Handle 'response' of type AuthPasswordChangeResponse
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.ChangePasswordError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.changePassword({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { currentPassword: "correct-horse-battery-staple", newPassword: "a-new-strong-passphrase" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuthPasswordChangeResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ChangePasswordRequest](src/models/change-password-request.ts)</code> | Change the signed-in user's password. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.changePassword(request)`

- **OnSuccess**: <code>[AuthPasswordChangeResponse](src/models/auth-password-change-response.ts)</code>
- **OnError**: throws <code>[AccountsApi.ChangePasswordError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.changePassword(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuthPasswordChangeResponse, AccountsApi.ChangePasswordError&gt;</code>, with `result.value` of type <code>[AuthPasswordChangeResponse](src/models/auth-password-change-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getCurrentUser(options?: RequestOptions): ApiPromise&lt;AuthMeResponse, AccountsApi.GetCurrentUserError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Current user and organization.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.accountsApi.getCurrentUser();
  // TODO: Handle 'response' of type AuthMeResponse
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.GetCurrentUserError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.getCurrentUser().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuthMeResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.getCurrentUser()`

- **OnSuccess**: <code>[AuthMeResponse](src/models/auth-me-response.ts)</code>
- **OnError**: throws <code>[AccountsApi.GetCurrentUserError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.getCurrentUser().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuthMeResponse, AccountsApi.GetCurrentUserError&gt;</code>, with `result.value` of type <code>[AuthMeResponse](src/models/auth-me-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>login(request: AccountsApi.LoginRequestParams, options?: RequestOptions): ApiPromise&lt;AuthLoginResponse, AccountsApi.LoginError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Sign in (sets httpOnly session cookie).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.accountsApi.login({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { email: "owner@demo.quartermaster.dev", password: "correct-horse-battery-staple" },
  });
  // TODO: Handle 'response' of type AuthLoginResponse
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.LoginError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.login({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { email: "owner@demo.quartermaster.dev", password: "correct-horse-battery-staple" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuthLoginResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[LoginRequest](src/models/login-request.ts)</code> | Email and password sign-in. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.login(request)`

- **OnSuccess**: <code>[AuthLoginResponse](src/models/auth-login-response.ts)</code>
- **OnError**: throws <code>[AccountsApi.LoginError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.login(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuthLoginResponse, AccountsApi.LoginError&gt;</code>, with `result.value` of type <code>[AuthLoginResponse](src/models/auth-login-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>logout(request: AccountsApi.LogoutRequest, options?: RequestOptions): ApiPromise&lt;undefined, AccountsApi.LogoutError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Sign out.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  await client.accountsApi.logout({ xRequestedWith: XRequestedWith.Quartermaster });
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.LogoutError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.logout({
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: The call succeeded and resolves to no body
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.logout(request)`

- **OnSuccess**: <code>undefined</code>
- **OnError**: throws <code>[AccountsApi.LogoutError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.logout(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;undefined, AccountsApi.LogoutError&gt;</code>, with `result.value` of type <code>undefined</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>requestPasswordReset(request: AccountsApi.RequestPasswordResetRequest, options?: RequestOptions): ApiPromise&lt;AuthPasswordForgotResponse, AccountsApi.RequestPasswordResetError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Email a password reset link (always 202).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.accountsApi.requestPasswordReset({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { email: "ada@example.com" },
  });
  // TODO: Handle 'response' of type AuthPasswordForgotResponse
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.RequestPasswordResetError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.requestPasswordReset({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { email: "ada@example.com" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuthPasswordForgotResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ForgotPasswordRequest](src/models/forgot-password-request.ts)</code> | Request a password reset email. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.requestPasswordReset(request)`

- **OnSuccess**: <code>[AuthPasswordForgotResponse](src/models/auth-password-forgot-response.ts)</code>
- **OnError**: throws <code>[AccountsApi.RequestPasswordResetError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.requestPasswordReset(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuthPasswordForgotResponse, AccountsApi.RequestPasswordResetError&gt;</code>, with `result.value` of type <code>[AuthPasswordForgotResponse](src/models/auth-password-forgot-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>resetPassword(request: AccountsApi.ResetPasswordRequestParams, options?: RequestOptions): ApiPromise&lt;AuthPasswordResetResponse, AccountsApi.ResetPasswordError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Set a new password from a one-time link.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.accountsApi.resetPassword({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { token: "3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", password: "a-new-strong-passphrase" },
  });
  // TODO: Handle 'response' of type AuthPasswordResetResponse
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.ResetPasswordError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.resetPassword({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { token: "3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", password: "a-new-strong-passphrase" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuthPasswordResetResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ResetPasswordRequest](src/models/reset-password-request.ts)</code> | Set a new password from a one-time reset link. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.resetPassword(request)`

- **OnSuccess**: <code>[AuthPasswordResetResponse](src/models/auth-password-reset-response.ts)</code>
- **OnError**: throws <code>[AccountsApi.ResetPasswordError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.resetPassword(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuthPasswordResetResponse, AccountsApi.ResetPasswordError&gt;</code>, with `result.value` of type <code>[AuthPasswordResetResponse](src/models/auth-password-reset-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>signup(request: AccountsApi.SignupRequestParams, options?: RequestOptions): ApiPromise&lt;AuthSignupResponse, AccountsApi.SignupError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Create a workspace and its owner (sets session cookie).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.accountsApi.signup({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      name: "Ada Owner",
      email: "ada@example.com",
      password: "correct-horse-battery-staple",
      organizationName: "Ada's Kitchen",
      timezone: "America/Los_Angeles",
      sampleData: true,
    },
  });
  // TODO: Handle 'response' of type AuthSignupResponse
} catch (err) {
  // TODO: Handle 'err' of type AccountsApi.SignupError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.accountsApi.signup({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    name: "Ada Owner",
    email: "ada@example.com",
    password: "correct-horse-battery-staple",
    organizationName: "Ada's Kitchen",
    timezone: "America/Los_Angeles",
    sampleData: true,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuthSignupResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[SignupRequest](src/models/signup-request.ts)</code> | Create a workspace and its first owner. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.accountsApi.signup(request)`

- **OnSuccess**: <code>[AuthSignupResponse](src/models/auth-signup-response.ts)</code>
- **OnError**: throws <code>[AccountsApi.SignupError](src/resources/accounts-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.accountsApi.signup(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuthSignupResponse, AccountsApi.SignupError&gt;</code>, with `result.value` of type <code>[AuthSignupResponse](src/models/auth-signup-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Team

> Source: [Team](src/resources/team.ts)

<details>
<summary><code>acceptInvitation(request: Team.AcceptInvitationRequestParams, options?: RequestOptions): ApiPromise&lt;InvitationsAcceptResponse, Team.AcceptInvitationError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Accept an invitation, create the account and sign in.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.acceptInvitation({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
      name: "Sam Manager",
      password: "a-new-strong-passphrase",
    },
  });
  // TODO: Handle 'response' of type InvitationsAcceptResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.AcceptInvitationError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.acceptInvitation({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
    name: "Sam Manager",
    password: "a-new-strong-passphrase",
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InvitationsAcceptResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[AcceptInvitationRequest](src/models/accept-invitation-request.ts)</code> | Accept an invitation: the invitee's name and new password, with the link token. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.acceptInvitation(request)`

- **OnSuccess**: <code>[InvitationsAcceptResponse](src/models/invitations-accept-response.ts)</code>
- **OnError**: throws <code>[Team.AcceptInvitationError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.acceptInvitation(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InvitationsAcceptResponse, Team.AcceptInvitationError&gt;</code>, with `result.value` of type <code>[InvitationsAcceptResponse](src/models/invitations-accept-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>inviteMember(request: Team.InviteMemberRequest, options?: RequestOptions): ApiPromise&lt;InvitationCreatedResponse, Team.InviteMemberError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.inviteMember({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { email: "sam@example.com", role: Role1.Manager },
  });
  // TODO: Handle 'response' of type InvitationCreatedResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.InviteMemberError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.inviteMember({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { email: "sam@example.com", role: Role1.Manager },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InvitationCreatedResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CreateInvitationRequest](src/models/create-invitation-request.ts)</code> | Invite an email address with a role. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.inviteMember(request)`

- **OnSuccess**: <code>[InvitationCreatedResponse](src/models/invitation-created-response.ts)</code>
- **OnError**: throws <code>[Team.InviteMemberError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.inviteMember(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InvitationCreatedResponse, Team.InviteMemberError&gt;</code>, with `result.value` of type <code>[InvitationCreatedResponse](src/models/invitation-created-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>issueMemberResetLink(request: Team.IssueMemberResetLinkRequest, options?: RequestOptions): ApiPromise&lt;ResetLinkResponse, Team.IssueMemberResetLinkError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Issue a one-time password reset link for a member. Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.issueMemberResetLink({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
  // TODO: Handle 'response' of type ResetLinkResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.IssueMemberResetLinkError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.issueMemberResetLink({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ResetLinkResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.issueMemberResetLink(request)`

- **OnSuccess**: <code>[ResetLinkResponse](src/models/reset-link-response.ts)</code>
- **OnError**: throws <code>[Team.IssueMemberResetLinkError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.issueMemberResetLink(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ResetLinkResponse, Team.IssueMemberResetLinkError&gt;</code>, with `result.value` of type <code>[ResetLinkResponse](src/models/reset-link-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listMembers(options?: RequestOptions): ApiPromise&lt;MembersResponse, Team.ListMembersError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Members, and open invitations for owners.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.listMembers();
  // TODO: Handle 'response' of type MembersResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.ListMembersError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.listMembers().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type MembersResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.listMembers()`

- **OnSuccess**: <code>[MembersResponse](src/models/members-response.ts)</code>
- **OnError**: throws <code>[Team.ListMembersError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.listMembers().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;MembersResponse, Team.ListMembersError&gt;</code>, with `result.value` of type <code>[MembersResponse](src/models/members-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>lookupInvitation(request: Team.LookupInvitationRequest, options?: RequestOptions): ApiPromise&lt;InvitationsLookupResponse, Team.LookupInvitationError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Preview an invitation from its link token.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.lookupInvitation({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu" },
  });
  // TODO: Handle 'response' of type InvitationsLookupResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.LookupInvitationError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.lookupInvitation({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InvitationsLookupResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[InvitationTokenRequest](src/models/invitation-token-request.ts)</code> | An invitation link token. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.lookupInvitation(request)`

- **OnSuccess**: <code>[InvitationsLookupResponse](src/models/invitations-lookup-response.ts)</code>
- **OnError**: throws <code>[Team.LookupInvitationError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.lookupInvitation(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InvitationsLookupResponse, Team.LookupInvitationError&gt;</code>, with `result.value` of type <code>[InvitationsLookupResponse](src/models/invitations-lookup-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>removeMember(request: Team.RemoveMemberRequest, options?: RequestOptions): ApiPromise&lt;undefined, Team.RemoveMemberError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Remove a member. Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  await client.team.removeMember({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
} catch (err) {
  // TODO: Handle 'err' of type Team.RemoveMemberError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.removeMember({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: The call succeeded and resolves to no body
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.removeMember(request)`

- **OnSuccess**: <code>undefined</code>
- **OnError**: throws <code>[Team.RemoveMemberError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.removeMember(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;undefined, Team.RemoveMemberError&gt;</code>, with `result.value` of type <code>undefined</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>revokeInvitation(request: Team.RevokeInvitationRequest, options?: RequestOptions): ApiPromise&lt;MembersInvitationsRevokeResponse, Team.RevokeInvitationError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Revoke an open invitation. Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.revokeInvitation({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
  // TODO: Handle 'response' of type MembersInvitationsRevokeResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.RevokeInvitationError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.revokeInvitation({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type MembersInvitationsRevokeResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.revokeInvitation(request)`

- **OnSuccess**: <code>[MembersInvitationsRevokeResponse](src/models/members-invitations-revoke-response.ts)</code>
- **OnError**: throws <code>[Team.RevokeInvitationError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.revokeInvitation(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;MembersInvitationsRevokeResponse, Team.RevokeInvitationError&gt;</code>, with `result.value` of type <code>[MembersInvitationsRevokeResponse](src/models/members-invitations-revoke-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>updateMemberRole(request: Team.UpdateMemberRoleRequestParams, options?: RequestOptions): ApiPromise&lt;MembersRoleResponse, Team.UpdateMemberRoleError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.team.updateMemberRole({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { role: Role1.Viewer },
  });
  // TODO: Handle 'response' of type MembersRoleResponse
} catch (err) {
  // TODO: Handle 'err' of type Team.UpdateMemberRoleError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.team.updateMemberRole({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { role: Role1.Viewer },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type MembersRoleResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[UpdateMemberRoleRequest](src/models/update-member-role-request.ts)</code> | A member's new role. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.team.updateMemberRole(request)`

- **OnSuccess**: <code>[MembersRoleResponse](src/models/members-role-response.ts)</code>
- **OnError**: throws <code>[Team.UpdateMemberRoleError](src/resources/team.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.team.updateMemberRole(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;MembersRoleResponse, Team.UpdateMemberRoleError&gt;</code>, with `result.value` of type <code>[MembersRoleResponse](src/models/members-role-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## InventoryApi

> Source: [InventoryApi](src/resources/inventory-api.ts)

<details>
<summary><code>adjustInventoryItem(request: InventoryApi.AdjustInventoryItemRequest, options?: RequestOptions): ApiPromise&lt;InventoryAdjustmentsResponse, InventoryApi.AdjustInventoryItemError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Record an authorized stock change. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.inventoryApi.adjustInventoryItem({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: { quantityDelta: -20, reason: Reason.Waste, note: "Damaged sleeve" },
  });
  // TODO: Handle 'response' of type InventoryAdjustmentsResponse
} catch (err) {
  // TODO: Handle 'err' of type InventoryApi.AdjustInventoryItemError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.inventoryApi.adjustInventoryItem({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: { quantityDelta: -20, reason: Reason.Waste, note: "Damaged sleeve" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InventoryAdjustmentsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[InventoryAdjustmentRequest](src/models/inventory-adjustment-request.ts)</code> | An authorised stock change with a reason. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.inventoryApi.adjustInventoryItem(request)`

- **OnSuccess**: <code>[InventoryAdjustmentsResponse](src/models/inventory-adjustments-response.ts)</code>
- **OnError**: throws <code>[InventoryApi.AdjustInventoryItemError](src/resources/inventory-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.inventoryApi.adjustInventoryItem(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InventoryAdjustmentsResponse, InventoryApi.AdjustInventoryItemError&gt;</code>, with `result.value` of type <code>[InventoryAdjustmentsResponse](src/models/inventory-adjustments-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>createInventoryItem(request: InventoryApi.CreateInventoryItemRequestParams, options?: RequestOptions): ApiPromise&lt;InventoryResponse1, InventoryApi.CreateInventoryItemError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Add a stock item. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.inventoryApi.createInventoryItem({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      sku: "BEV-COLA-CAN",
      name: "Cola cans",
      category: Category.Beverages,
      unit: "each",
      safetyStock: 24,
      coverageDays: 4,
      searchQuery: "cola soda cans 24 pack",
      keywords: ["cola", "soda"],
      onHand: 48,
    },
  });
  // TODO: Handle 'response' of type InventoryResponse1
} catch (err) {
  // TODO: Handle 'err' of type InventoryApi.CreateInventoryItemError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.inventoryApi.createInventoryItem({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    sku: "BEV-COLA-CAN",
    name: "Cola cans",
    category: Category.Beverages,
    unit: "each",
    safetyStock: 24,
    coverageDays: 4,
    searchQuery: "cola soda cans 24 pack",
    keywords: ["cola", "soda"],
    onHand: 48,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InventoryResponse1
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CreateInventoryItemRequest](src/models/create-inventory-item-request.ts)</code> | A new stock item, including its opening on-hand count. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.inventoryApi.createInventoryItem(request)`

- **OnSuccess**: <code>[InventoryResponse1](src/models/inventory-response1.ts)</code>
- **OnError**: throws <code>[InventoryApi.CreateInventoryItemError](src/resources/inventory-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.inventoryApi.createInventoryItem(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InventoryResponse1, InventoryApi.CreateInventoryItemError&gt;</code>, with `result.value` of type <code>[InventoryResponse1](src/models/inventory-response1.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>forecastInventory(request: InventoryApi.ForecastInventoryRequest, options?: RequestOptions): ApiPromise&lt;ForecastRunDto, InventoryApi.ForecastInventoryError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Calculate reorder recommendations. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.inventoryApi.forecastInventory({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { demandMultiplier: 1.25 },
  });
  // TODO: Handle 'response' of type ForecastRunDto
} catch (err) {
  // TODO: Handle 'err' of type InventoryApi.ForecastInventoryError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.inventoryApi.forecastInventory({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { demandMultiplier: 1.25 },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ForecastRunDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ForecastRequest](src/models/forecast-request.ts)</code> | Parameters for a reorder forecast. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.inventoryApi.forecastInventory(request)`

- **OnSuccess**: <code>[ForecastRunDto](src/models/forecast-run-dto.ts)</code>
- **OnError**: throws <code>[InventoryApi.ForecastInventoryError](src/resources/inventory-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.inventoryApi.forecastInventory(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ForecastRunDto, InventoryApi.ForecastInventoryError&gt;</code>, with `result.value` of type <code>[ForecastRunDto](src/models/forecast-run-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listInventory(options?: RequestOptions): ApiPromise&lt;InventoryResponse, InventoryApi.ListInventoryError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Current stock, usage and alerts.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.inventoryApi.listInventory();
  // TODO: Handle 'response' of type InventoryResponse
} catch (err) {
  // TODO: Handle 'err' of type InventoryApi.ListInventoryError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.inventoryApi.listInventory().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InventoryResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.inventoryApi.listInventory()`

- **OnSuccess**: <code>[InventoryResponse](src/models/inventory-response.ts)</code>
- **OnError**: throws <code>[InventoryApi.ListInventoryError](src/resources/inventory-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.inventoryApi.listInventory().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InventoryResponse, InventoryApi.ListInventoryError&gt;</code>, with `result.value` of type <code>[InventoryResponse](src/models/inventory-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>updateInventoryItem(request: InventoryApi.UpdateInventoryItemRequest, options?: RequestOptions): ApiPromise&lt;InventoryResponse1, InventoryApi.UpdateInventoryItemError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Update a stock item's details (not its quantity). Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.inventoryApi.updateInventoryItem({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      sku: "some example string",
      name: "some example string",
      category: Category.FoodPackaging,
      unit: "some example string",
      safetyStock: 1,
      coverageDays: 1,
      searchQuery: "some example string",
    },
  });
  // TODO: Handle 'response' of type InventoryResponse1
} catch (err) {
  // TODO: Handle 'err' of type InventoryApi.UpdateInventoryItemError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.inventoryApi.updateInventoryItem({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    sku: "some example string",
    name: "some example string",
    category: Category.FoodPackaging,
    unit: "some example string",
    safetyStock: 1,
    coverageDays: 1,
    searchQuery: "some example string",
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InventoryResponse1
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[InventoryItemInput](src/models/inventory-item-input.ts)</code> | Editable details of a stock item (quantities change through adjustments). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.inventoryApi.updateInventoryItem(request)`

- **OnSuccess**: <code>[InventoryResponse1](src/models/inventory-response1.ts)</code>
- **OnError**: throws <code>[InventoryApi.UpdateInventoryItemError](src/resources/inventory-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.inventoryApi.updateInventoryItem(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InventoryResponse1, InventoryApi.UpdateInventoryItemError&gt;</code>, with `result.value` of type <code>[InventoryResponse1](src/models/inventory-response1.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Suppliers

> Source: [Suppliers](src/resources/suppliers.ts)

<details>
<summary><code>createCatalogItem(request: Suppliers.CreateCatalogItemRequest, options?: RequestOptions): ApiPromise&lt;SuppliersCatalogResponse, Suppliers.CreateCatalogItemError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Add a catalog listing (screened for prompt injection). Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.suppliers.createCatalogItem({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      sku: "BB-COLA-24",
      title: "Cola, 24 x 12 oz cans",
      description: "Classic cola",
      category: Category.Beverages,
      inventoryItemId: "00000000-0000-0000-0000-000000000000",
      packQuantity: 24,
      unitPriceMinor: 1499,
      inStock: true,
      recurring: false,
    },
  });
  // TODO: Handle 'response' of type SuppliersCatalogResponse
} catch (err) {
  // TODO: Handle 'err' of type Suppliers.CreateCatalogItemError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.suppliers.createCatalogItem({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    sku: "BB-COLA-24",
    title: "Cola, 24 x 12 oz cans",
    description: "Classic cola",
    category: Category.Beverages,
    inventoryItemId: "00000000-0000-0000-0000-000000000000",
    packQuantity: 24,
    unitPriceMinor: 1499,
    inStock: true,
    recurring: false,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SuppliersCatalogResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CatalogItemInput](src/models/catalog-item-input.ts)</code> | Fields for creating or updating a catalog listing. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.suppliers.createCatalogItem(request)`

- **OnSuccess**: <code>[SuppliersCatalogResponse](src/models/suppliers-catalog-response.ts)</code>
- **OnError**: throws <code>[Suppliers.CreateCatalogItemError](src/resources/suppliers.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.suppliers.createCatalogItem(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SuppliersCatalogResponse, Suppliers.CreateCatalogItemError&gt;</code>, with `result.value` of type <code>[SuppliersCatalogResponse](src/models/suppliers-catalog-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>createSupplier(request: Suppliers.CreateSupplierRequest, options?: RequestOptions): ApiPromise&lt;SuppliersResponse1, Suppliers.CreateSupplierError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.suppliers.createSupplier({
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      name: "Bayside Beverages",
      website: "https://bayside.example.com",
      description: "Local drinks distributor",
      leadTimeDays: 2,
      taxRateBps: 825,
      feeTerms: [
        {
          code: "SHIP_STD",
          label: "Delivery",
          kind: Kind1.Shipping,
          amountMinor: 900,
          waivedOverMinor: 15000,
        },
      ],
      active: true,
      checkoutEligible: true,
    },
  });
  // TODO: Handle 'response' of type SuppliersResponse1
} catch (err) {
  // TODO: Handle 'err' of type Suppliers.CreateSupplierError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.suppliers.createSupplier({
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    name: "Bayside Beverages",
    website: "https://bayside.example.com",
    description: "Local drinks distributor",
    leadTimeDays: 2,
    taxRateBps: 825,
    feeTerms: [
      { code: "SHIP_STD", label: "Delivery", kind: Kind1.Shipping, amountMinor: 900, waivedOverMinor: 15000 },
    ],
    active: true,
    checkoutEligible: true,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SuppliersResponse1
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[SupplierInput](src/models/supplier-input.ts)</code> | Fields for creating or updating a supplier. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.suppliers.createSupplier(request)`

- **OnSuccess**: <code>[SuppliersResponse1](src/models/suppliers-response1.ts)</code>
- **OnError**: throws <code>[Suppliers.CreateSupplierError](src/resources/suppliers.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.suppliers.createSupplier(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SuppliersResponse1, Suppliers.CreateSupplierError&gt;</code>, with `result.value` of type <code>[SuppliersResponse1](src/models/suppliers-response1.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getSupplier(request: Suppliers.GetSupplierRequest, options?: RequestOptions): ApiPromise&lt;SuppliersResponse1, Suppliers.GetSupplierError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Supplier with its catalog.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.suppliers.getSupplier({ id: "0f8fad5b-d9cb-469f-a165-70867728950e" });
  // TODO: Handle 'response' of type SuppliersResponse1
} catch (err) {
  // TODO: Handle 'err' of type Suppliers.GetSupplierError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.suppliers.getSupplier({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SuppliersResponse1
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.suppliers.getSupplier(request)`

- **OnSuccess**: <code>[SuppliersResponse1](src/models/suppliers-response1.ts)</code>
- **OnError**: throws <code>[Suppliers.GetSupplierError](src/resources/suppliers.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.suppliers.getSupplier(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SuppliersResponse1, Suppliers.GetSupplierError&gt;</code>, with `result.value` of type <code>[SuppliersResponse1](src/models/suppliers-response1.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listSuppliers(options?: RequestOptions): ApiPromise&lt;SuppliersResponse, Suppliers.ListSuppliersError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Suppliers with mandate approval and catalog size.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.suppliers.listSuppliers();
  // TODO: Handle 'response' of type SuppliersResponse
} catch (err) {
  // TODO: Handle 'err' of type Suppliers.ListSuppliersError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.suppliers.listSuppliers().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SuppliersResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.suppliers.listSuppliers()`

- **OnSuccess**: <code>[SuppliersResponse](src/models/suppliers-response.ts)</code>
- **OnError**: throws <code>[Suppliers.ListSuppliersError](src/resources/suppliers.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.suppliers.listSuppliers().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SuppliersResponse, Suppliers.ListSuppliersError&gt;</code>, with `result.value` of type <code>[SuppliersResponse](src/models/suppliers-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>updateCatalogItem(request: Suppliers.UpdateCatalogItemRequest, options?: RequestOptions): ApiPromise&lt;SuppliersCatalogResponse, Suppliers.UpdateCatalogItemError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Update a catalog listing. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.suppliers.updateCatalogItem({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    itemId: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: {
      sku: "some example string",
      title: "some example string",
      category: Category.FoodPackaging,
      packQuantity: 1,
      unitPriceMinor: 1,
    },
  });
  // TODO: Handle 'response' of type SuppliersCatalogResponse
} catch (err) {
  // TODO: Handle 'err' of type Suppliers.UpdateCatalogItemError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.suppliers.updateCatalogItem({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  itemId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: {
    sku: "some example string",
    title: "some example string",
    category: Category.FoodPackaging,
    packQuantity: 1,
    unitPriceMinor: 1,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SuppliersCatalogResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>itemId</code> | <code>string</code> | itemId id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CatalogItemInput](src/models/catalog-item-input.ts)</code> | Fields for creating or updating a catalog listing. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.suppliers.updateCatalogItem(request)`

- **OnSuccess**: <code>[SuppliersCatalogResponse](src/models/suppliers-catalog-response.ts)</code>
- **OnError**: throws <code>[Suppliers.UpdateCatalogItemError](src/resources/suppliers.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.suppliers.updateCatalogItem(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SuppliersCatalogResponse, Suppliers.UpdateCatalogItemError&gt;</code>, with `result.value` of type <code>[SuppliersCatalogResponse](src/models/suppliers-catalog-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>updateSupplier(request: Suppliers.UpdateSupplierRequest, options?: RequestOptions): ApiPromise&lt;SuppliersResponse1, Suppliers.UpdateSupplierError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Update a supplier. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.suppliers.updateSupplier({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { name: "some example string", leadTimeDays: 1, taxRateBps: 1 },
  });
  // TODO: Handle 'response' of type SuppliersResponse1
} catch (err) {
  // TODO: Handle 'err' of type Suppliers.UpdateSupplierError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.suppliers.updateSupplier({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { name: "some example string", leadTimeDays: 1, taxRateBps: 1 },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SuppliersResponse1
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[SupplierInput](src/models/supplier-input.ts)</code> | Fields for creating or updating a supplier. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.suppliers.updateSupplier(request)`

- **OnSuccess**: <code>[SuppliersResponse1](src/models/suppliers-response1.ts)</code>
- **OnError**: throws <code>[Suppliers.UpdateSupplierError](src/resources/suppliers.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.suppliers.updateSupplier(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SuppliersResponse1, Suppliers.UpdateSupplierError&gt;</code>, with `result.value` of type <code>[SuppliersResponse1](src/models/suppliers-response1.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Procurement

> Source: [Procurement](src/resources/procurement.ts)

<details>
<summary><code>approveProcurementRequest(request: Procurement.ApproveProcurementRequestRequest, options?: RequestOptions): ApiPromise&lt;ProcurementRequestsApproveResponse, Procurement.ApproveProcurementRequestError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.approveProcurementRequest({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: {
      purchaseOrderId: "0f8fad5b-d9cb-469f-a165-70867728950e",
      cartHash: "sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f",
      acknowledgedReviewCodes: ["MARKET_REFERENCE_UNAVAILABLE"],
    },
  });
  // TODO: Handle 'response' of type ProcurementRequestsApproveResponse
} catch (err) {
  // TODO: Handle 'err' of type Procurement.ApproveProcurementRequestError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.approveProcurementRequest({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: {
    purchaseOrderId: "0f8fad5b-d9cb-469f-a165-70867728950e",
    cartHash: "sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f",
    acknowledgedReviewCodes: ["MARKET_REFERENCE_UNAVAILABLE"],
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestsApproveResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[ApproveRequest](src/models/approve-request.ts)</code> | The owner's approval of one exact proposal, bound to the cart hash they saw. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.approveProcurementRequest(request)`

- **OnSuccess**: <code>[ProcurementRequestsApproveResponse](src/models/procurement-requests-approve-response.ts)</code>
- **OnError**: throws <code>[Procurement.ApproveProcurementRequestError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.approveProcurementRequest(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestsApproveResponse, Procurement.ApproveProcurementRequestError&gt;</code>, with `result.value` of type <code>[ProcurementRequestsApproveResponse](src/models/procurement-requests-approve-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>createProcurementRequest(request: Procurement.CreateProcurementRequestRequest, options?: RequestOptions): ApiPromise&lt;ProcurementRequestDto, Procurement.CreateProcurementRequestError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Submit a natural-language request. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.createProcurementRequest({
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: {
      instruction:
        "We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.",
      currency: Currency.Usd,
      allowAlternatives: true,
    },
  });
  // TODO: Handle 'response' of type ProcurementRequestDto
} catch (err) {
  // TODO: Handle 'err' of type Procurement.CreateProcurementRequestError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.createProcurementRequest({
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: {
    instruction:
      "We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.",
    currency: Currency.Usd,
    allowAlternatives: true,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[CreateProcurementRequest](src/models/create-procurement-request.ts)</code> | A natural-language purchasing instruction for the agent. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.createProcurementRequest(request)`

- **OnSuccess**: <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: throws <code>[Procurement.CreateProcurementRequestError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.createProcurementRequest(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestDto, Procurement.CreateProcurementRequestError&gt;</code>, with `result.value` of type <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>evaluateProcurementRequest(request: Procurement.EvaluateProcurementRequestRequest, options?: RequestOptions): ApiPromise&lt;ProcurementRequestDto, Procurement.EvaluateProcurementRequestError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Re-run TrustRail on open proposals. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.evaluateProcurementRequest({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
  // TODO: Handle 'response' of type ProcurementRequestDto
} catch (err) {
  // TODO: Handle 'err' of type Procurement.EvaluateProcurementRequestError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.evaluateProcurementRequest({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.evaluateProcurementRequest(request)`

- **OnSuccess**: <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: throws <code>[Procurement.EvaluateProcurementRequestError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.evaluateProcurementRequest(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestDto, Procurement.EvaluateProcurementRequestError&gt;</code>, with `result.value` of type <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getProcurementRequest(request: Procurement.GetProcurementRequestRequest, options?: RequestOptions): ApiPromise&lt;ProcurementRequestDto, Procurement.GetProcurementRequestError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Request with forecast, market evidence, candidates, proposals and TrustRail decisions.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.getProcurementRequest({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  });
  // TODO: Handle 'response' of type ProcurementRequestDto
} catch (err) {
  // TODO: Handle 'err' of type Procurement.GetProcurementRequestError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.getProcurementRequest({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.getProcurementRequest(request)`

- **OnSuccess**: <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: throws <code>[Procurement.GetProcurementRequestError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.getProcurementRequest(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestDto, Procurement.GetProcurementRequestError&gt;</code>, with `result.value` of type <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listProcurementRequests(options?: RequestOptions): ApiPromise&lt;ProcurementRequestsResponse, Procurement.ListProcurementRequestsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

List procurement requests.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.listProcurementRequests();
  // TODO: Handle 'response' of type ProcurementRequestsResponse
} catch (err) {
  // TODO: Handle 'err' of type Procurement.ListProcurementRequestsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.listProcurementRequests().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.listProcurementRequests()`

- **OnSuccess**: <code>[ProcurementRequestsResponse](src/models/procurement-requests-response.ts)</code>
- **OnError**: throws <code>[Procurement.ListProcurementRequestsError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.listProcurementRequests().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestsResponse, Procurement.ListProcurementRequestsError&gt;</code>, with `result.value` of type <code>[ProcurementRequestsResponse](src/models/procurement-requests-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>rejectProcurementRequest(request: Procurement.RejectProcurementRequestRequest, options?: RequestOptions): ApiPromise&lt;ProcurementRequestDto, Procurement.RejectProcurementRequestError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.rejectProcurementRequest({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { reason: "Not needed this week" },
  });
  // TODO: Handle 'response' of type ProcurementRequestDto
} catch (err) {
  // TODO: Handle 'err' of type Procurement.RejectProcurementRequestError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.rejectProcurementRequest({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { reason: "Not needed this week" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[RejectRequest](src/models/reject-request.ts)</code> | Reject one proposal, or every open proposal on the request. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.rejectProcurementRequest(request)`

- **OnSuccess**: <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: throws <code>[Procurement.RejectProcurementRequestError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.rejectProcurementRequest(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestDto, Procurement.RejectProcurementRequestError&gt;</code>, with `result.value` of type <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>researchProcurementRequest(request: Procurement.ResearchProcurementRequestRequest, options?: RequestOptions): ApiPromise&lt;ProcurementRequestDto, Procurement.ResearchProcurementRequestError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.procurement.researchProcurementRequest({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
  // TODO: Handle 'response' of type ProcurementRequestDto
} catch (err) {
  // TODO: Handle 'err' of type Procurement.ResearchProcurementRequestError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.procurement.researchProcurementRequest({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProcurementRequestDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.procurement.researchProcurementRequest(request)`

- **OnSuccess**: <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: throws <code>[Procurement.ResearchProcurementRequestError](src/resources/procurement.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.procurement.researchProcurementRequest(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProcurementRequestDto, Procurement.ResearchProcurementRequestError&gt;</code>, with `result.value` of type <code>[ProcurementRequestDto](src/models/procurement-request-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## TrustRail

> Source: [TrustRail](src/resources/trust-rail.ts)

<details>
<summary><code>getSpendMandate(options?: RequestOptions): ApiPromise&lt;MandatesCurrentResponse, TrustRail.GetSpendMandateError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Active Spend Mandate and weekly budget.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.trustRail.getSpendMandate();
  // TODO: Handle 'response' of type MandatesCurrentResponse
} catch (err) {
  // TODO: Handle 'err' of type TrustRail.GetSpendMandateError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.trustRail.getSpendMandate().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type MandatesCurrentResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.trustRail.getSpendMandate()`

- **OnSuccess**: <code>[MandatesCurrentResponse](src/models/mandates-current-response.ts)</code>
- **OnError**: throws <code>[TrustRail.GetSpendMandateError](src/resources/trust-rail.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.trustRail.getSpendMandate().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;MandatesCurrentResponse, TrustRail.GetSpendMandateError&gt;</code>, with `result.value` of type <code>[MandatesCurrentResponse](src/models/mandates-current-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>updateSpendMandate(request: TrustRail.UpdateSpendMandateRequest, options?: RequestOptions): ApiPromise&lt;MandateUpdateResponse, TrustRail.UpdateSpendMandateError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.trustRail.updateSpendMandate({
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: {
      weeklyBudgetMinor: 1,
      perOrderLimitMinor: 1,
      autoApprovalLimitMinor: 1,
      humanApprovalRequired: true,
      approvedSupplierIds: ["00000000-0000-0000-0000-000000000000"],
      allowedCategories: [AllowedCategory.FoodPackaging],
      maxMarketPricePremiumPct: 1,
      marketPriceAction: MarketPriceAction.Review,
      duplicateWindowHours: 1,
      duplicateAction: DuplicateAction.Review,
      subscriptionsAllowed: true,
      certificateTtlMinutes: 1,
      maxQuantityMultipleOfNeed: 1.5,
      expectedVersion: 1,
    },
  });
  // TODO: Handle 'response' of type MandateUpdateResponse
} catch (err) {
  // TODO: Handle 'err' of type TrustRail.UpdateSpendMandateError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.trustRail.updateSpendMandate({
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: {
    weeklyBudgetMinor: 1,
    perOrderLimitMinor: 1,
    autoApprovalLimitMinor: 1,
    humanApprovalRequired: true,
    approvedSupplierIds: ["00000000-0000-0000-0000-000000000000"],
    allowedCategories: [AllowedCategory.FoodPackaging],
    maxMarketPricePremiumPct: 1,
    marketPriceAction: MarketPriceAction.Review,
    duplicateWindowHours: 1,
    duplicateAction: DuplicateAction.Review,
    subscriptionsAllowed: true,
    certificateTtlMinutes: 1,
    maxQuantityMultipleOfNeed: 1.5,
    expectedVersion: 1,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type MandateUpdateResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[SpendMandateInput](src/models/spend-mandate-input.ts)</code> | A new Spend Mandate version (optimistic concurrency on `expected_version`). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.trustRail.updateSpendMandate(request)`

- **OnSuccess**: <code>[MandateUpdateResponse](src/models/mandate-update-response.ts)</code>
- **OnError**: throws <code>[TrustRail.UpdateSpendMandateError](src/resources/trust-rail.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.trustRail.updateSpendMandate(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;MandateUpdateResponse, TrustRail.UpdateSpendMandateError&gt;</code>, with `result.value` of type <code>[MandateUpdateResponse](src/models/mandate-update-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>verifyIntentCertificate(request: TrustRail.VerifyIntentCertificateRequest, options?: RequestOptions): ApiPromise&lt;CertificateVerificationDto, TrustRail.VerifyIntentCertificateError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Verify an Intent Certificate against the live cart.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.trustRail.verifyIntentCertificate({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  });
  // TODO: Handle 'response' of type CertificateVerificationDto
} catch (err) {
  // TODO: Handle 'err' of type TrustRail.VerifyIntentCertificateError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.trustRail.verifyIntentCertificate({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type CertificateVerificationDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.trustRail.verifyIntentCertificate(request)`

- **OnSuccess**: <code>[CertificateVerificationDto](src/models/certificate-verification-dto.ts)</code>
- **OnError**: throws <code>[TrustRail.VerifyIntentCertificateError](src/resources/trust-rail.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.trustRail.verifyIntentCertificate(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;CertificateVerificationDto, TrustRail.VerifyIntentCertificateError&gt;</code>, with `result.value` of type <code>[CertificateVerificationDto](src/models/certificate-verification-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## PaymentsApi

> Source: [PaymentsApi](src/resources/payments-api.ts)

<details>
<summary><code>capturePayment(request: PaymentsApi.CapturePaymentRequestParams, options?: RequestOptions): ApiPromise&lt;PaymentsCaptureResponse, PaymentsApi.CapturePaymentError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.paymentsApi.capturePayment({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: { paypalOrderId: "5O190127TN364715T" },
  });
  // TODO: Handle 'response' of type PaymentsCaptureResponse
} catch (err) {
  // TODO: Handle 'err' of type PaymentsApi.CapturePaymentError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.paymentsApi.capturePayment({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: { paypalOrderId: "5O190127TN364715T" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PaymentsCaptureResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[CapturePaymentRequest](src/models/capture-payment-request.ts)</code> | Capture a PayPal order the buyer approved. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.paymentsApi.capturePayment(request)`

- **OnSuccess**: <code>[PaymentsCaptureResponse](src/models/payments-capture-response.ts)</code>
- **OnError**: throws <code>[PaymentsApi.CapturePaymentError](src/resources/payments-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.paymentsApi.capturePayment(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PaymentsCaptureResponse, PaymentsApi.CapturePaymentError&gt;</code>, with `result.value` of type <code>[PaymentsCaptureResponse](src/models/payments-capture-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>createPayPalOrder(request: PaymentsApi.CreatePayPalOrderRequest, options?: RequestOptions): ApiPromise&lt;PayPalOrderResponse, PaymentsApi.CreatePayPalOrderError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.paymentsApi.createPayPalOrder({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  });
  // TODO: Handle 'response' of type PayPalOrderResponse
} catch (err) {
  // TODO: Handle 'err' of type PaymentsApi.CreatePayPalOrderError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.paymentsApi.createPayPalOrder({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PayPalOrderResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.paymentsApi.createPayPalOrder(request)`

- **OnSuccess**: <code>[PayPalOrderResponse](src/models/pay-pal-order-response.ts)</code>
- **OnError**: throws <code>[PaymentsApi.CreatePayPalOrderError](src/resources/payments-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.paymentsApi.createPayPalOrder(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PayPalOrderResponse, PaymentsApi.CreatePayPalOrderError&gt;</code>, with `result.value` of type <code>[PayPalOrderResponse](src/models/pay-pal-order-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getPayment(request: PaymentsApi.GetPaymentRequest, options?: RequestOptions): ApiPromise&lt;PaymentDto, PaymentsApi.GetPaymentError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Verified payment state.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.paymentsApi.getPayment({ id: "0f8fad5b-d9cb-469f-a165-70867728950e" });
  // TODO: Handle 'response' of type PaymentDto
} catch (err) {
  // TODO: Handle 'err' of type PaymentsApi.GetPaymentError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.paymentsApi.getPayment({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PaymentDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.paymentsApi.getPayment(request)`

- **OnSuccess**: <code>[PaymentDto](src/models/payment-dto.ts)</code>
- **OnError**: throws <code>[PaymentsApi.GetPaymentError](src/resources/payments-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.paymentsApi.getPayment(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PaymentDto, PaymentsApi.GetPaymentError&gt;</code>, with `result.value` of type <code>[PaymentDto](src/models/payment-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>receivePayPalWebhook(options?: RequestOptions): ApiPromise&lt;WebhookAckResponse, PaymentsApi.ReceivePayPalWebhookError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

PayPal webhook receiver (signature-verified).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.paymentsApi.receivePayPalWebhook();
  // TODO: Handle 'response' of type WebhookAckResponse
} catch (err) {
  // TODO: Handle 'err' of type PaymentsApi.ReceivePayPalWebhookError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.paymentsApi.receivePayPalWebhook().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type WebhookAckResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.paymentsApi.receivePayPalWebhook()`

- **OnSuccess**: <code>[WebhookAckResponse](src/models/webhook-ack-response.ts)</code>
- **OnError**: throws <code>[PaymentsApi.ReceivePayPalWebhookError](src/resources/payments-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.paymentsApi.receivePayPalWebhook().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;WebhookAckResponse, PaymentsApi.ReceivePayPalWebhookError&gt;</code>, with `result.value` of type <code>[WebhookAckResponse](src/models/webhook-ack-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>refundPayment(request: PaymentsApi.RefundPaymentRequest, options?: RequestOptions): ApiPromise&lt;PaymentsRefundResponse, PaymentsApi.RefundPaymentError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Owner-authorized refund. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.paymentsApi.refundPayment({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: { reason: "Damaged on arrival" },
  });
  // TODO: Handle 'response' of type PaymentsRefundResponse
} catch (err) {
  // TODO: Handle 'err' of type PaymentsApi.RefundPaymentError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.paymentsApi.refundPayment({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: { reason: "Damaged on arrival" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PaymentsRefundResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[RefundRequest](src/models/refund-request.ts)</code> | Refund part or all of a captured payment. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.paymentsApi.refundPayment(request)`

- **OnSuccess**: <code>[PaymentsRefundResponse](src/models/payments-refund-response.ts)</code>
- **OnError**: throws <code>[PaymentsApi.RefundPaymentError](src/resources/payments-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.paymentsApi.refundPayment(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PaymentsRefundResponse, PaymentsApi.RefundPaymentError&gt;</code>, with `result.value` of type <code>[PaymentsRefundResponse](src/models/payments-refund-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>syncPayment(request: PaymentsApi.SyncPaymentRequest, options?: RequestOptions): ApiPromise&lt;PaymentDto, PaymentsApi.SyncPaymentError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.paymentsApi.syncPayment({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
  // TODO: Handle 'response' of type PaymentDto
} catch (err) {
  // TODO: Handle 'err' of type PaymentsApi.SyncPaymentError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.paymentsApi.syncPayment({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PaymentDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.paymentsApi.syncPayment(request)`

- **OnSuccess**: <code>[PaymentDto](src/models/payment-dto.ts)</code>
- **OnError**: throws <code>[PaymentsApi.SyncPaymentError](src/resources/payments-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.paymentsApi.syncPayment(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PaymentDto, PaymentsApi.SyncPaymentError&gt;</code>, with `result.value` of type <code>[PaymentDto](src/models/payment-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Orders

> Source: [Orders](src/resources/orders.ts)

<details>
<summary><code>analyzeInvoice(request: Orders.AnalyzeInvoiceRequestParams, options?: RequestOptions): ApiPromise&lt;InvoiceDto, Orders.AnalyzeInvoiceError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.analyzeInvoice({
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: {
      supplierId: "00000000-0000-0000-0000-000000000000",
      invoiceNumber: "some example string",
      invoiceDate: "some example string",
      lines: [{ description: "some example string", quantity: 1, unitPriceMinor: 1, lineTotalMinor: 1 }],
      totalMinor: 1,
    },
  });
  // TODO: Handle 'response' of type InvoiceDto
} catch (err) {
  // TODO: Handle 'err' of type Orders.AnalyzeInvoiceError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.analyzeInvoice({
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: {
    supplierId: "00000000-0000-0000-0000-000000000000",
    invoiceNumber: "some example string",
    invoiceDate: "some example string",
    lines: [{ description: "some example string", quantity: 1, unitPriceMinor: 1, lineTotalMinor: 1 }],
    totalMinor: 1,
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InvoiceDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[AnalyzeInvoiceRequest](src/models/analyze-invoice-request.ts)</code> | A supplier invoice to match against its purchase order and delivery. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.analyzeInvoice(request)`

- **OnSuccess**: <code>[InvoiceDto](src/models/invoice-dto.ts)</code>
- **OnError**: throws <code>[Orders.AnalyzeInvoiceError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.analyzeInvoice(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InvoiceDto, Orders.AnalyzeInvoiceError&gt;</code>, with `result.value` of type <code>[InvoiceDto](src/models/invoice-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>delayDelivery(request: Orders.DelayDeliveryRequestParams, options?: RequestOptions): ApiPromise&lt;DeliveriesDelayResponse, Orders.DelayDeliveryError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Record a supplier delay. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.delayDelivery({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    body: { newExpectedDate: "2026-11-15", reason: "Carrier delay" },
  });
  // TODO: Handle 'response' of type DeliveriesDelayResponse
} catch (err) {
  // TODO: Handle 'err' of type Orders.DelayDeliveryError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.delayDelivery({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  body: { newExpectedDate: "2026-11-15", reason: "Carrier delay" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type DeliveriesDelayResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[DelayDeliveryRequest](src/models/delay-delivery-request.ts)</code> | Move a delivery's expected date, with a reason. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.delayDelivery(request)`

- **OnSuccess**: <code>[DeliveriesDelayResponse](src/models/deliveries-delay-response.ts)</code>
- **OnError**: throws <code>[Orders.DelayDeliveryError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.delayDelivery(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;DeliveriesDelayResponse, Orders.DelayDeliveryError&gt;</code>, with `result.value` of type <code>[DeliveriesDelayResponse](src/models/deliveries-delay-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getPurchaseOrder(request: Orders.GetPurchaseOrderRequest, options?: RequestOptions): ApiPromise&lt;PurchaseOrderDto, Orders.GetPurchaseOrderError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

One purchase order.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.getPurchaseOrder({ id: "0f8fad5b-d9cb-469f-a165-70867728950e" });
  // TODO: Handle 'response' of type PurchaseOrderDto
} catch (err) {
  // TODO: Handle 'err' of type Orders.GetPurchaseOrderError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.getPurchaseOrder({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PurchaseOrderDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.getPurchaseOrder(request)`

- **OnSuccess**: <code>[PurchaseOrderDto](src/models/purchase-order-dto.ts)</code>
- **OnError**: throws <code>[Orders.GetPurchaseOrderError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.getPurchaseOrder(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PurchaseOrderDto, Orders.GetPurchaseOrderError&gt;</code>, with `result.value` of type <code>[PurchaseOrderDto](src/models/purchase-order-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listDeliveries(options?: RequestOptions): ApiPromise&lt;DeliveriesResponse, Orders.ListDeliveriesError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Synthetic deliveries.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.listDeliveries();
  // TODO: Handle 'response' of type DeliveriesResponse
} catch (err) {
  // TODO: Handle 'err' of type Orders.ListDeliveriesError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.listDeliveries().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type DeliveriesResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.listDeliveries()`

- **OnSuccess**: <code>[DeliveriesResponse](src/models/deliveries-response.ts)</code>
- **OnError**: throws <code>[Orders.ListDeliveriesError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.listDeliveries().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;DeliveriesResponse, Orders.ListDeliveriesError&gt;</code>, with `result.value` of type <code>[DeliveriesResponse](src/models/deliveries-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listInvoices(options?: RequestOptions): ApiPromise&lt;InvoicesResponse, Orders.ListInvoicesError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Recorded invoices.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.listInvoices();
  // TODO: Handle 'response' of type InvoicesResponse
} catch (err) {
  // TODO: Handle 'err' of type Orders.ListInvoicesError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.listInvoices().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type InvoicesResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.listInvoices()`

- **OnSuccess**: <code>[InvoicesResponse](src/models/invoices-response.ts)</code>
- **OnError**: throws <code>[Orders.ListInvoicesError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.listInvoices().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;InvoicesResponse, Orders.ListInvoicesError&gt;</code>, with `result.value` of type <code>[InvoicesResponse](src/models/invoices-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listPurchaseOrders(options?: RequestOptions): ApiPromise&lt;PurchaseOrdersResponse, Orders.ListPurchaseOrdersError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Purchase order history, optionally filtered by status.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.listPurchaseOrders();
  // TODO: Handle 'response' of type PurchaseOrdersResponse
} catch (err) {
  // TODO: Handle 'err' of type Orders.ListPurchaseOrdersError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.listPurchaseOrders().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type PurchaseOrdersResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.listPurchaseOrders()`

- **OnSuccess**: <code>[PurchaseOrdersResponse](src/models/purchase-orders-response.ts)</code>
- **OnError**: throws <code>[Orders.ListPurchaseOrdersError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.listPurchaseOrders().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;PurchaseOrdersResponse, Orders.ListPurchaseOrdersError&gt;</code>, with `result.value` of type <code>[PurchaseOrdersResponse](src/models/purchase-orders-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>receiveDelivery(request: Orders.ReceiveDeliveryRequestParams, options?: RequestOptions): ApiPromise&lt;DeliveriesReceiveResponse, Orders.ReceiveDeliveryError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.orders.receiveDelivery({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
    idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    body: { lines: [{ purchaseOrderItemId: "00000000-0000-0000-0000-000000000000", quantityReceived: 1 }] },
  });
  // TODO: Handle 'response' of type DeliveriesReceiveResponse
} catch (err) {
  // TODO: Handle 'err' of type Orders.ReceiveDeliveryError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.orders.receiveDelivery({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
  body: { lines: [{ purchaseOrderItemId: "00000000-0000-0000-0000-000000000000", quantityReceived: 1 }] },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type DeliveriesReceiveResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotencyKey</code> | <code>string</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[ReceiveDeliveryRequest](src/models/receive-delivery-request.ts)</code> | Quantities received per purchase order line. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.orders.receiveDelivery(request)`

- **OnSuccess**: <code>[DeliveriesReceiveResponse](src/models/deliveries-receive-response.ts)</code>
- **OnError**: throws <code>[Orders.ReceiveDeliveryError](src/resources/orders.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.orders.receiveDelivery(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;DeliveriesReceiveResponse, Orders.ReceiveDeliveryError&gt;</code>, with `result.value` of type <code>[DeliveriesReceiveResponse](src/models/deliveries-receive-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## SecurityApi

> Source: [SecurityApi](src/resources/security-api.ts)

<details>
<summary><code>getPayPalNotificationStatus(options?: RequestOptions): ApiPromise&lt;SecurityPaypalNotificationsResponse, SecurityApi.GetPayPalNotificationStatusError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Whether PayPal's signed notifications are arriving.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.securityApi.getPayPalNotificationStatus();
  // TODO: Handle 'response' of type SecurityPaypalNotificationsResponse
} catch (err) {
  // TODO: Handle 'err' of type SecurityApi.GetPayPalNotificationStatusError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.securityApi.getPayPalNotificationStatus().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SecurityPaypalNotificationsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.securityApi.getPayPalNotificationStatus()`

- **OnSuccess**: <code>[SecurityPaypalNotificationsResponse](src/models/security-paypal-notifications-response.ts)</code>
- **OnError**: throws <code>[SecurityApi.GetPayPalNotificationStatusError](src/resources/security-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.securityApi.getPayPalNotificationStatus().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SecurityPaypalNotificationsResponse, SecurityApi.GetPayPalNotificationStatusError&gt;</code>, with `result.value` of type <code>[SecurityPaypalNotificationsResponse](src/models/security-paypal-notifications-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listAuditEvents(options?: RequestOptions): ApiPromise&lt;SecurityAuditResponse, SecurityApi.ListAuditEventsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Hash-chained audit log.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.securityApi.listAuditEvents();
  // TODO: Handle 'response' of type SecurityAuditResponse
} catch (err) {
  // TODO: Handle 'err' of type SecurityApi.ListAuditEventsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.securityApi.listAuditEvents().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SecurityAuditResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.securityApi.listAuditEvents()`

- **OnSuccess**: <code>[SecurityAuditResponse](src/models/security-audit-response.ts)</code>
- **OnError**: throws <code>[SecurityApi.ListAuditEventsError](src/resources/security-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.securityApi.listAuditEvents().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SecurityAuditResponse, SecurityApi.ListAuditEventsError&gt;</code>, with `result.value` of type <code>[SecurityAuditResponse](src/models/security-audit-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listPolicyDecisions(options?: RequestOptions): ApiPromise&lt;SecurityDecisionsResponse, SecurityApi.ListPolicyDecisionsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Policy decisions.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.securityApi.listPolicyDecisions();
  // TODO: Handle 'response' of type SecurityDecisionsResponse
} catch (err) {
  // TODO: Handle 'err' of type SecurityApi.ListPolicyDecisionsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.securityApi.listPolicyDecisions().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SecurityDecisionsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.securityApi.listPolicyDecisions()`

- **OnSuccess**: <code>[SecurityDecisionsResponse](src/models/security-decisions-response.ts)</code>
- **OnError**: throws <code>[SecurityApi.ListPolicyDecisionsError](src/resources/security-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.securityApi.listPolicyDecisions().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SecurityDecisionsResponse, SecurityApi.ListPolicyDecisionsError&gt;</code>, with `result.value` of type <code>[SecurityDecisionsResponse](src/models/security-decisions-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listSecurityFindings(options?: RequestOptions): ApiPromise&lt;SecurityEventsResponse, SecurityApi.ListSecurityFindingsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

TrustRail findings and evidence.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.securityApi.listSecurityFindings();
  // TODO: Handle 'response' of type SecurityEventsResponse
} catch (err) {
  // TODO: Handle 'err' of type SecurityApi.ListSecurityFindingsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.securityApi.listSecurityFindings().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SecurityEventsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.securityApi.listSecurityFindings()`

- **OnSuccess**: <code>[SecurityEventsResponse](src/models/security-events-response.ts)</code>
- **OnError**: throws <code>[SecurityApi.ListSecurityFindingsError](src/resources/security-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.securityApi.listSecurityFindings().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SecurityEventsResponse, SecurityApi.ListSecurityFindingsError&gt;</code>, with `result.value` of type <code>[SecurityEventsResponse](src/models/security-events-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>verifyAuditChain(options?: RequestOptions): ApiPromise&lt;AuditChainVerificationDto, SecurityApi.VerifyAuditChainError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Verify the audit hash chain. Requires the MANAGER role.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.securityApi.verifyAuditChain();
  // TODO: Handle 'response' of type AuditChainVerificationDto
} catch (err) {
  // TODO: Handle 'err' of type SecurityApi.VerifyAuditChainError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.securityApi.verifyAuditChain().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AuditChainVerificationDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.securityApi.verifyAuditChain()`

- **OnSuccess**: <code>[AuditChainVerificationDto](src/models/audit-chain-verification-dto.ts)</code>
- **OnError**: throws <code>[SecurityApi.VerifyAuditChainError](src/resources/security-api.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.securityApi.verifyAuditChain().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AuditChainVerificationDto, SecurityApi.VerifyAuditChainError&gt;</code>, with `result.value` of type <code>[AuditChainVerificationDto](src/models/audit-chain-verification-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Analytics

> Source: [Analytics](src/resources/analytics.ts)

<details>
<summary><code>getAnalyticsSummary(options?: RequestOptions): ApiPromise&lt;AnalyticsSummaryDto, Analytics.GetAnalyticsSummaryError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Business and security outcomes.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.analytics.getAnalyticsSummary();
  // TODO: Handle 'response' of type AnalyticsSummaryDto
} catch (err) {
  // TODO: Handle 'err' of type Analytics.GetAnalyticsSummaryError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.analytics.getAnalyticsSummary().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AnalyticsSummaryDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.analytics.getAnalyticsSummary()`

- **OnSuccess**: <code>[AnalyticsSummaryDto](src/models/analytics-summary-dto.ts)</code>
- **OnError**: throws <code>[Analytics.GetAnalyticsSummaryError](src/resources/analytics.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.analytics.getAnalyticsSummary().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AnalyticsSummaryDto, Analytics.GetAnalyticsSummaryError&gt;</code>, with `result.value` of type <code>[AnalyticsSummaryDto](src/models/analytics-summary-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Operations

> Source: [Operations](src/resources/operations.ts)

<details>
<summary><code>getPlatformHealth(options?: RequestOptions): ApiPromise&lt;OpsHealthDto, Operations.GetPlatformHealthError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Platform health (operators).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.operations.getPlatformHealth();
  // TODO: Handle 'response' of type OpsHealthDto
} catch (err) {
  // TODO: Handle 'err' of type Operations.GetPlatformHealthError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.operations.getPlatformHealth().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type OpsHealthDto
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.operations.getPlatformHealth()`

- **OnSuccess**: <code>[OpsHealthDto](src/models/ops-health-dto.ts)</code>
- **OnError**: throws <code>[Operations.GetPlatformHealthError](src/resources/operations.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.operations.getPlatformHealth().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;OpsHealthDto, Operations.GetPlatformHealthError&gt;</code>, with `result.value` of type <code>[OpsHealthDto](src/models/ops-health-dto.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listTrackedErrors(options?: RequestOptions): ApiPromise&lt;OpsErrorsResponse, Operations.ListTrackedErrorsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Tracked error groups (operators).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.operations.listTrackedErrors();
  // TODO: Handle 'response' of type OpsErrorsResponse
} catch (err) {
  // TODO: Handle 'err' of type Operations.ListTrackedErrorsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.operations.listTrackedErrors().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type OpsErrorsResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.operations.listTrackedErrors()`

- **OnSuccess**: <code>[OpsErrorsResponse](src/models/ops-errors-response.ts)</code>
- **OnError**: throws <code>[Operations.ListTrackedErrorsError](src/resources/operations.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.operations.listTrackedErrors().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;OpsErrorsResponse, Operations.ListTrackedErrorsError&gt;</code>, with `result.value` of type <code>[OpsErrorsResponse](src/models/ops-errors-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>resolveTrackedError(request: Operations.ResolveTrackedErrorRequest, options?: RequestOptions): ApiPromise&lt;OpsErrorsResolveResponse, Operations.ResolveTrackedErrorError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Resolve an error group; it reopens and alerts if it recurs.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.operations.resolveTrackedError({
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    xRequestedWith: XRequestedWith.Quartermaster,
  });
  // TODO: Handle 'response' of type OpsErrorsResolveResponse
} catch (err) {
  // TODO: Handle 'err' of type Operations.ResolveTrackedErrorError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.operations.resolveTrackedError({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type OpsErrorsResolveResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | Resource id (UUID). |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.operations.resolveTrackedError(request)`

- **OnSuccess**: <code>[OpsErrorsResolveResponse](src/models/ops-errors-resolve-response.ts)</code>
- **OnError**: throws <code>[Operations.ResolveTrackedErrorError](src/resources/operations.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.operations.resolveTrackedError(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;OpsErrorsResolveResponse, Operations.ResolveTrackedErrorError&gt;</code>, with `result.value` of type <code>[OpsErrorsResolveResponse](src/models/ops-errors-resolve-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>sendTestAlert(request: Operations.SendTestAlertRequest, options?: RequestOptions): ApiPromise&lt;AlertTestResponse, Operations.SendTestAlertError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a test alert to every configured channel.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.operations.sendTestAlert({ xRequestedWith: XRequestedWith.Quartermaster });
  // TODO: Handle 'response' of type AlertTestResponse
} catch (err) {
  // TODO: Handle 'err' of type Operations.SendTestAlertError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.operations.sendTestAlert({
  xRequestedWith: XRequestedWith.Quartermaster,
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AlertTestResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>xRequestedWith</code> | <code>[XRequestedWith](src/models/xrequested-with.ts)</code> | CSRF guard: must be `quartermaster` on every mutation. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.operations.sendTestAlert(request)`

- **OnSuccess**: <code>[AlertTestResponse](src/models/alert-test-response.ts)</code>
- **OnError**: throws <code>[Operations.SendTestAlertError](src/resources/operations.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.operations.sendTestAlert(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AlertTestResponse, Operations.SendTestAlertError&gt;</code>, with `result.value` of type <code>[AlertTestResponse](src/models/alert-test-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[QuartermasterAiTrustRailApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

