# Reference

**Parsed** endpoints return the typed payload and raise `ApiError` on a documented non-2xx. For the raw endpoints, see [Raw API Reference](raw-api-reference.md).

> Source: [QuartermasterAiTrustRailApiClient](quartermaster_ai_trust_rail_api/client.py)

## AccountsApi

> Source: [AccountsApi](quartermaster_ai_trust_rail_api/apis/accounts_api.py)

<details>
<summary><code>def change_password(x_requested_with: XRequestedWithOrStr, body: ChangePasswordRequest | ChangePasswordRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> AuthPasswordChangeResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Change your password (signs out other sessions).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.accounts_api.change_password(
        XRequestedWith.QUARTERMASTER,
        ChangePasswordRequest(current_password="correct-horse-battery-staple", new_password="a-new-strong-passphrase"),
    )
    # TODO: Handle 'response' of type AuthPasswordChangeResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ChangePasswordErrorBody
```

**Async**

```python
try:
    response = await async_client.accounts_api.change_password(
        XRequestedWith.QUARTERMASTER,
        ChangePasswordRequest(current_password="correct-horse-battery-staple", new_password="a-new-strong-passphrase"),
    )
    # TODO: Handle 'response' of type AuthPasswordChangeResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ChangePasswordErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ChangePasswordRequest](quartermaster_ai_trust_rail_api/models/change_password_request.py) \| [ChangePasswordRequestDict](quartermaster_ai_trust_rail_api/models/change_password_request.py)</code> | Change the signed-in user's password. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuthPasswordChangeResponse](quartermaster_ai_trust_rail_api/models/auth_password_change_response.py)</code> -- Change your password (signs out other sessions)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ChangePasswordErrorBody](quartermaster_ai_trust_rail_api/errors/change_password_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_current_user(*, request_options: RequestOptionsOrDict | None = None) -> AuthMeResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Current user and organization.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.accounts_api.get_current_user()
    # TODO: Handle 'response' of type AuthMeResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetCurrentUserErrorBody
```

**Async**

```python
try:
    response = await async_client.accounts_api.get_current_user()
    # TODO: Handle 'response' of type AuthMeResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetCurrentUserErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuthMeResponse](quartermaster_ai_trust_rail_api/models/auth_me_response.py)</code> -- Current user and organization

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetCurrentUserErrorBody](quartermaster_ai_trust_rail_api/errors/get_current_user_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def login(x_requested_with: XRequestedWithOrStr, body: LoginRequest | LoginRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> AuthLoginResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Sign in (sets httpOnly session cookie).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.accounts_api.login(
        XRequestedWith.QUARTERMASTER,
        LoginRequest(email="owner@demo.quartermaster.dev", password="correct-horse-battery-staple"),
    )
    # TODO: Handle 'response' of type AuthLoginResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type LoginErrorBody
```

**Async**

```python
try:
    response = await async_client.accounts_api.login(
        XRequestedWith.QUARTERMASTER,
        LoginRequest(email="owner@demo.quartermaster.dev", password="correct-horse-battery-staple"),
    )
    # TODO: Handle 'response' of type AuthLoginResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type LoginErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[LoginRequest](quartermaster_ai_trust_rail_api/models/login_request.py) \| [LoginRequestDict](quartermaster_ai_trust_rail_api/models/login_request.py)</code> | Email and password sign-in. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuthLoginResponse](quartermaster_ai_trust_rail_api/models/auth_login_response.py)</code> -- Sign in (sets httpOnly session cookie)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[LoginErrorBody](quartermaster_ai_trust_rail_api/errors/login_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def logout(x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> None</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Sign out.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    client.accounts_api.logout(XRequestedWith.QUARTERMASTER)
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type LogoutErrorBody
```

**Async**

```python
try:
    await async_client.accounts_api.logout(XRequestedWith.QUARTERMASTER)
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type LogoutErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: No content

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[LogoutErrorBody](quartermaster_ai_trust_rail_api/errors/logout_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def request_password_reset(x_requested_with: XRequestedWithOrStr, body: ForgotPasswordRequest | ForgotPasswordRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> AuthPasswordForgotResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Email a password reset link (always 202).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.accounts_api.request_password_reset(
        XRequestedWith.QUARTERMASTER, ForgotPasswordRequest(email="ada@example.com")
    )
    # TODO: Handle 'response' of type AuthPasswordForgotResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RequestPasswordResetErrorBody
```

**Async**

```python
try:
    response = await async_client.accounts_api.request_password_reset(
        XRequestedWith.QUARTERMASTER, ForgotPasswordRequest(email="ada@example.com")
    )
    # TODO: Handle 'response' of type AuthPasswordForgotResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RequestPasswordResetErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ForgotPasswordRequest](quartermaster_ai_trust_rail_api/models/forgot_password_request.py) \| [ForgotPasswordRequestDict](quartermaster_ai_trust_rail_api/models/forgot_password_request.py)</code> | Request a password reset email. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuthPasswordForgotResponse](quartermaster_ai_trust_rail_api/models/auth_password_forgot_response.py)</code> -- Email a password reset link (always 202)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[RequestPasswordResetErrorBody](quartermaster_ai_trust_rail_api/errors/request_password_reset_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def reset_password(x_requested_with: XRequestedWithOrStr, body: ResetPasswordRequest | ResetPasswordRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> AuthPasswordResetResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Set a new password from a one-time link.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.accounts_api.reset_password(
        XRequestedWith.QUARTERMASTER,
        ResetPasswordRequest(token="3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", password="a-new-strong-passphrase"),
    )
    # TODO: Handle 'response' of type AuthPasswordResetResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ResetPasswordErrorBody
```

**Async**

```python
try:
    response = await async_client.accounts_api.reset_password(
        XRequestedWith.QUARTERMASTER,
        ResetPasswordRequest(token="3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", password="a-new-strong-passphrase"),
    )
    # TODO: Handle 'response' of type AuthPasswordResetResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ResetPasswordErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ResetPasswordRequest](quartermaster_ai_trust_rail_api/models/reset_password_request.py) \| [ResetPasswordRequestDict](quartermaster_ai_trust_rail_api/models/reset_password_request.py)</code> | Set a new password from a one-time reset link. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuthPasswordResetResponse](quartermaster_ai_trust_rail_api/models/auth_password_reset_response.py)</code> -- Set a new password from a one-time link

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ResetPasswordErrorBody](quartermaster_ai_trust_rail_api/errors/reset_password_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def signup(x_requested_with: XRequestedWithOrStr, body: SignupRequest | SignupRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> AuthSignupResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Create a workspace and its owner (sets session cookie).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.accounts_api.signup(
        XRequestedWith.QUARTERMASTER,
        SignupRequest(
            name="Ada Owner",
            email="ada@example.com",
            password="correct-horse-battery-staple",
            organization_name="Ada's Kitchen",
            timezone="America/Los_Angeles",
            sample_data=True,
        ),
    )
    # TODO: Handle 'response' of type AuthSignupResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SignupErrorBody
```

**Async**

```python
try:
    response = await async_client.accounts_api.signup(
        XRequestedWith.QUARTERMASTER,
        SignupRequest(
            name="Ada Owner",
            email="ada@example.com",
            password="correct-horse-battery-staple",
            organization_name="Ada's Kitchen",
            timezone="America/Los_Angeles",
            sample_data=True,
        ),
    )
    # TODO: Handle 'response' of type AuthSignupResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SignupErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[SignupRequest](quartermaster_ai_trust_rail_api/models/signup_request.py) \| [SignupRequestDict](quartermaster_ai_trust_rail_api/models/signup_request.py)</code> | Create a workspace and its first owner. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuthSignupResponse](quartermaster_ai_trust_rail_api/models/auth_signup_response.py)</code> -- Create a workspace and its owner (sets session cookie)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[SignupErrorBody](quartermaster_ai_trust_rail_api/errors/signup_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Analytics

> Source: [Analytics](quartermaster_ai_trust_rail_api/apis/analytics.py)

<details>
<summary><code>def get_analytics_summary(*, request_options: RequestOptionsOrDict | None = None) -> AnalyticsSummaryDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Business and security outcomes.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.analytics.get_analytics_summary()
    # TODO: Handle 'response' of type AnalyticsSummaryDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetAnalyticsSummaryErrorBody
```

**Async**

```python
try:
    response = await async_client.analytics.get_analytics_summary()
    # TODO: Handle 'response' of type AnalyticsSummaryDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetAnalyticsSummaryErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AnalyticsSummaryDto](quartermaster_ai_trust_rail_api/models/analytics_summary_dto.py)</code> -- Business and security outcomes

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetAnalyticsSummaryErrorBody](quartermaster_ai_trust_rail_api/errors/get_analytics_summary_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## InventoryApi

> Source: [InventoryApi](quartermaster_ai_trust_rail_api/apis/inventory_api.py)

<details>
<summary><code>def adjust_inventory_item(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: InventoryAdjustmentRequest | InventoryAdjustmentRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> InventoryAdjustmentsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Record an authorized stock change. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.inventory_api.adjust_inventory_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        InventoryAdjustmentRequest(quantity_delta=-20, reason=Reason.WASTE, note="Damaged sleeve"),
    )
    # TODO: Handle 'response' of type InventoryAdjustmentsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type AdjustInventoryItemErrorBody
```

**Async**

```python
try:
    response = await async_client.inventory_api.adjust_inventory_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        InventoryAdjustmentRequest(quantity_delta=-20, reason=Reason.WASTE, note="Damaged sleeve"),
    )
    # TODO: Handle 'response' of type InventoryAdjustmentsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type AdjustInventoryItemErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[InventoryAdjustmentRequest](quartermaster_ai_trust_rail_api/models/inventory_adjustment_request.py) \| [InventoryAdjustmentRequestDict](quartermaster_ai_trust_rail_api/models/inventory_adjustment_request.py)</code> | An authorised stock change with a reason. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InventoryAdjustmentsResponse](quartermaster_ai_trust_rail_api/models/inventory_adjustments_response.py)</code> -- Record an authorized stock change

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[AdjustInventoryItemErrorBody](quartermaster_ai_trust_rail_api/errors/adjust_inventory_item_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def create_inventory_item(x_requested_with: XRequestedWithOrStr, body: CreateInventoryItemRequest | CreateInventoryItemRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> InventoryResponse1</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Add a stock item. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.inventory_api.create_inventory_item(
        XRequestedWith.QUARTERMASTER,
        CreateInventoryItemRequest(
            sku="BEV-COLA-CAN",
            name="Cola cans",
            category=Category.BEVERAGES,
            unit="each",
            safety_stock=24,
            coverage_days=4,
            search_query="cola soda cans 24 pack",
            keywords=["cola", "soda"],
            on_hand=48,
        ),
    )
    # TODO: Handle 'response' of type InventoryResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateInventoryItemErrorBody
```

**Async**

```python
try:
    response = await async_client.inventory_api.create_inventory_item(
        XRequestedWith.QUARTERMASTER,
        CreateInventoryItemRequest(
            sku="BEV-COLA-CAN",
            name="Cola cans",
            category=Category.BEVERAGES,
            unit="each",
            safety_stock=24,
            coverage_days=4,
            search_query="cola soda cans 24 pack",
            keywords=["cola", "soda"],
            on_hand=48,
        ),
    )
    # TODO: Handle 'response' of type InventoryResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateInventoryItemErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CreateInventoryItemRequest](quartermaster_ai_trust_rail_api/models/create_inventory_item_request.py) \| [CreateInventoryItemRequestDict](quartermaster_ai_trust_rail_api/models/create_inventory_item_request.py)</code> | A new stock item, including its opening on-hand count. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InventoryResponse1](quartermaster_ai_trust_rail_api/models/inventory_response1.py)</code> -- Add a stock item

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[CreateInventoryItemErrorBody](quartermaster_ai_trust_rail_api/errors/create_inventory_item_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def forecast_inventory(x_requested_with: XRequestedWithOrStr, body: ForecastRequest | ForecastRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ForecastRunDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Calculate reorder recommendations. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.inventory_api.forecast_inventory(
        XRequestedWith.QUARTERMASTER, ForecastRequest(demand_multiplier=1.25)
    )
    # TODO: Handle 'response' of type ForecastRunDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ForecastInventoryErrorBody
```

**Async**

```python
try:
    response = await async_client.inventory_api.forecast_inventory(
        XRequestedWith.QUARTERMASTER, ForecastRequest(demand_multiplier=1.25)
    )
    # TODO: Handle 'response' of type ForecastRunDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ForecastInventoryErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ForecastRequest](quartermaster_ai_trust_rail_api/models/forecast_request.py) \| [ForecastRequestDict](quartermaster_ai_trust_rail_api/models/forecast_request.py)</code> | Parameters for a reorder forecast. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ForecastRunDto](quartermaster_ai_trust_rail_api/models/forecast_run_dto.py)</code> -- Calculate reorder recommendations

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ForecastInventoryErrorBody](quartermaster_ai_trust_rail_api/errors/forecast_inventory_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_inventory(*, request_options: RequestOptionsOrDict | None = None) -> InventoryResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Current stock, usage and alerts.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.inventory_api.list_inventory()
    # TODO: Handle 'response' of type InventoryResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListInventoryErrorBody
```

**Async**

```python
try:
    response = await async_client.inventory_api.list_inventory()
    # TODO: Handle 'response' of type InventoryResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListInventoryErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InventoryResponse](quartermaster_ai_trust_rail_api/models/inventory_response.py)</code> -- Current stock, usage and alerts

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListInventoryErrorBody](quartermaster_ai_trust_rail_api/errors/list_inventory_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def update_inventory_item(id_: UUID, x_requested_with: XRequestedWithOrStr, body: InventoryItemInput | InventoryItemInputDict, *, request_options: RequestOptionsOrDict | None = None) -> InventoryResponse1</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Update a stock item's details (not its quantity). Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.inventory_api.update_inventory_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        InventoryItemInput(
            sku="some example string",
            name="some example string",
            category=Category.FOOD_PACKAGING,
            unit="some example string",
            safety_stock=1,
            coverage_days=1,
            search_query="some example string",
        ),
    )
    # TODO: Handle 'response' of type InventoryResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateInventoryItemErrorBody
```

**Async**

```python
try:
    response = await async_client.inventory_api.update_inventory_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        InventoryItemInput(
            sku="some example string",
            name="some example string",
            category=Category.FOOD_PACKAGING,
            unit="some example string",
            safety_stock=1,
            coverage_days=1,
            search_query="some example string",
        ),
    )
    # TODO: Handle 'response' of type InventoryResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateInventoryItemErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[InventoryItemInput](quartermaster_ai_trust_rail_api/models/inventory_item_input.py) \| [InventoryItemInputDict](quartermaster_ai_trust_rail_api/models/inventory_item_input.py)</code> | Editable details of a stock item (quantities change through adjustments). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InventoryResponse1](quartermaster_ai_trust_rail_api/models/inventory_response1.py)</code> -- Update a stock item's details (not its quantity)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[UpdateInventoryItemErrorBody](quartermaster_ai_trust_rail_api/errors/update_inventory_item_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Operations

> Source: [Operations](quartermaster_ai_trust_rail_api/apis/operations.py)

<details>
<summary><code>def get_platform_health(*, request_options: RequestOptionsOrDict | None = None) -> OpsHealthDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Platform health (operators).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.operations.get_platform_health()
    # TODO: Handle 'response' of type OpsHealthDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPlatformHealthErrorBody
```

**Async**

```python
try:
    response = await async_client.operations.get_platform_health()
    # TODO: Handle 'response' of type OpsHealthDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPlatformHealthErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[OpsHealthDto](quartermaster_ai_trust_rail_api/models/ops_health_dto.py)</code> -- Platform health (operators)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetPlatformHealthErrorBody](quartermaster_ai_trust_rail_api/errors/get_platform_health_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_tracked_errors(*, request_options: RequestOptionsOrDict | None = None) -> OpsErrorsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Tracked error groups (operators).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.operations.list_tracked_errors()
    # TODO: Handle 'response' of type OpsErrorsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListTrackedErrorsErrorBody
```

**Async**

```python
try:
    response = await async_client.operations.list_tracked_errors()
    # TODO: Handle 'response' of type OpsErrorsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListTrackedErrorsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[OpsErrorsResponse](quartermaster_ai_trust_rail_api/models/ops_errors_response.py)</code> -- Tracked error groups (operators)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListTrackedErrorsErrorBody](quartermaster_ai_trust_rail_api/errors/list_tracked_errors_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def resolve_tracked_error(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> OpsErrorsResolveResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Resolve an error group; it reopens and alerts if it recurs.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.operations.resolve_tracked_error(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type OpsErrorsResolveResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ResolveTrackedErrorBody
```

**Async**

```python
try:
    response = await async_client.operations.resolve_tracked_error(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type OpsErrorsResolveResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ResolveTrackedErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[OpsErrorsResolveResponse](quartermaster_ai_trust_rail_api/models/ops_errors_resolve_response.py)</code> -- Resolve an error group; it reopens and alerts if it recurs

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ResolveTrackedErrorBody](quartermaster_ai_trust_rail_api/errors/resolve_tracked_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def send_test_alert(x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> AlertTestResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a test alert to every configured channel.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.operations.send_test_alert(XRequestedWith.QUARTERMASTER)
    # TODO: Handle 'response' of type AlertTestResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SendTestAlertErrorBody
```

**Async**

```python
try:
    response = await async_client.operations.send_test_alert(XRequestedWith.QUARTERMASTER)
    # TODO: Handle 'response' of type AlertTestResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SendTestAlertErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AlertTestResponse](quartermaster_ai_trust_rail_api/models/alert_test_response.py)</code> -- Send a test alert to every configured channel

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[SendTestAlertErrorBody](quartermaster_ai_trust_rail_api/errors/send_test_alert_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Orders

> Source: [Orders](quartermaster_ai_trust_rail_api/apis/orders.py)

<details>
<summary><code>def analyze_invoice(x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> InvoiceDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.analyze_invoice(
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        AnalyzeInvoiceRequest(
            supplier_id=UUID("00000000-0000-0000-0000-000000000000"),
            invoice_number="some example string",
            invoice_date="some example string",
            lines=[Line1(description="some example string", quantity=1, unit_price_minor=1, line_total_minor=1)],
            total_minor=1,
        ),
    )
    # TODO: Handle 'response' of type InvoiceDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type AnalyzeInvoiceErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.analyze_invoice(
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        AnalyzeInvoiceRequest(
            supplier_id=UUID("00000000-0000-0000-0000-000000000000"),
            invoice_number="some example string",
            invoice_date="some example string",
            lines=[Line1(description="some example string", quantity=1, unit_price_minor=1, line_total_minor=1)],
            total_minor=1,
        ),
    )
    # TODO: Handle 'response' of type InvoiceDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type AnalyzeInvoiceErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[AnalyzeInvoiceRequest](quartermaster_ai_trust_rail_api/models/analyze_invoice_request.py) \| [AnalyzeInvoiceRequestDict](quartermaster_ai_trust_rail_api/models/analyze_invoice_request.py)</code> | A supplier invoice to match against its purchase order and delivery. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InvoiceDto](quartermaster_ai_trust_rail_api/models/invoice_dto.py)</code> -- Three-way match and duplicate detection

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[AnalyzeInvoiceErrorBody](quartermaster_ai_trust_rail_api/errors/analyze_invoice_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def delay_delivery(id_: UUID, x_requested_with: XRequestedWithOrStr, body: DelayDeliveryRequest | DelayDeliveryRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> DeliveriesDelayResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Record a supplier delay. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.delay_delivery(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        DelayDeliveryRequest(new_expected_date="2026-11-15", reason="Carrier delay"),
    )
    # TODO: Handle 'response' of type DeliveriesDelayResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type DelayDeliveryErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.delay_delivery(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        DelayDeliveryRequest(new_expected_date="2026-11-15", reason="Carrier delay"),
    )
    # TODO: Handle 'response' of type DeliveriesDelayResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type DelayDeliveryErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[DelayDeliveryRequest](quartermaster_ai_trust_rail_api/models/delay_delivery_request.py) \| [DelayDeliveryRequestDict](quartermaster_ai_trust_rail_api/models/delay_delivery_request.py)</code> | Move a delivery's expected date, with a reason. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[DeliveriesDelayResponse](quartermaster_ai_trust_rail_api/models/deliveries_delay_response.py)</code> -- Record a supplier delay

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[DelayDeliveryErrorBody](quartermaster_ai_trust_rail_api/errors/delay_delivery_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_purchase_order(id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> PurchaseOrderDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

One purchase order.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.get_purchase_order(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type PurchaseOrderDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPurchaseOrderErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.get_purchase_order(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type PurchaseOrderDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPurchaseOrderErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PurchaseOrderDto](quartermaster_ai_trust_rail_api/models/purchase_order_dto.py)</code> -- One purchase order

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetPurchaseOrderErrorBody](quartermaster_ai_trust_rail_api/errors/get_purchase_order_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_deliveries(*, request_options: RequestOptionsOrDict | None = None) -> DeliveriesResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Synthetic deliveries.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.list_deliveries()
    # TODO: Handle 'response' of type DeliveriesResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListDeliveriesErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.list_deliveries()
    # TODO: Handle 'response' of type DeliveriesResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListDeliveriesErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[DeliveriesResponse](quartermaster_ai_trust_rail_api/models/deliveries_response.py)</code> -- Synthetic deliveries

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListDeliveriesErrorBody](quartermaster_ai_trust_rail_api/errors/list_deliveries_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_invoices(*, request_options: RequestOptionsOrDict | None = None) -> InvoicesResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Recorded invoices.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.list_invoices()
    # TODO: Handle 'response' of type InvoicesResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListInvoicesErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.list_invoices()
    # TODO: Handle 'response' of type InvoicesResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListInvoicesErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InvoicesResponse](quartermaster_ai_trust_rail_api/models/invoices_response.py)</code> -- Recorded invoices

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListInvoicesErrorBody](quartermaster_ai_trust_rail_api/errors/list_invoices_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_purchase_orders(*, request_options: RequestOptionsOrDict | None = None) -> PurchaseOrdersResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Purchase order history, optionally filtered by status.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.list_purchase_orders()
    # TODO: Handle 'response' of type PurchaseOrdersResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListPurchaseOrdersErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.list_purchase_orders()
    # TODO: Handle 'response' of type PurchaseOrdersResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListPurchaseOrdersErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PurchaseOrdersResponse](quartermaster_ai_trust_rail_api/models/purchase_orders_response.py)</code> -- Purchase order history, optionally filtered by status

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListPurchaseOrdersErrorBody](quartermaster_ai_trust_rail_api/errors/list_purchase_orders_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def receive_delivery(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: ReceiveDeliveryRequest | ReceiveDeliveryRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> DeliveriesReceiveResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.orders.receive_delivery(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        ReceiveDeliveryRequest(
            lines=[Line(purchase_order_item_id=UUID("00000000-0000-0000-0000-000000000000"), quantity_received=1)]
        ),
    )
    # TODO: Handle 'response' of type DeliveriesReceiveResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReceiveDeliveryErrorBody
```

**Async**

```python
try:
    response = await async_client.orders.receive_delivery(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        ReceiveDeliveryRequest(
            lines=[Line(purchase_order_item_id=UUID("00000000-0000-0000-0000-000000000000"), quantity_received=1)]
        ),
    )
    # TODO: Handle 'response' of type DeliveriesReceiveResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReceiveDeliveryErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[ReceiveDeliveryRequest](quartermaster_ai_trust_rail_api/models/receive_delivery_request.py) \| [ReceiveDeliveryRequestDict](quartermaster_ai_trust_rail_api/models/receive_delivery_request.py)</code> | Quantities received per purchase order line. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[DeliveriesReceiveResponse](quartermaster_ai_trust_rail_api/models/deliveries_receive_response.py)</code> -- Confirm goods receipt (updates inventory)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ReceiveDeliveryErrorBody](quartermaster_ai_trust_rail_api/errors/receive_delivery_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## PaymentsApi

> Source: [PaymentsApi](quartermaster_ai_trust_rail_api/apis/payments_api.py)

<details>
<summary><code>def capture_payment(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: CapturePaymentRequest | CapturePaymentRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> PaymentsCaptureResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.payments_api.capture_payment(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        CapturePaymentRequest(paypal_order_id="5O190127TN364715T"),
    )
    # TODO: Handle 'response' of type PaymentsCaptureResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CapturePaymentErrorBody
```

**Async**

```python
try:
    response = await async_client.payments_api.capture_payment(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        CapturePaymentRequest(paypal_order_id="5O190127TN364715T"),
    )
    # TODO: Handle 'response' of type PaymentsCaptureResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CapturePaymentErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[CapturePaymentRequest](quartermaster_ai_trust_rail_api/models/capture_payment_request.py) \| [CapturePaymentRequestDict](quartermaster_ai_trust_rail_api/models/capture_payment_request.py)</code> | Capture a PayPal order the buyer approved. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PaymentsCaptureResponse](quartermaster_ai_trust_rail_api/models/payments_capture_response.py)</code> -- Guarded capture of an approved PayPal order

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[CapturePaymentErrorBody](quartermaster_ai_trust_rail_api/errors/capture_payment_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def create_pay_pal_order(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, *, request_options: RequestOptionsOrDict | None = None) -> PayPalOrderResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.payments_api.create_pay_pal_order(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    )
    # TODO: Handle 'response' of type PayPalOrderResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreatePayPalOrderErrorBody
```

**Async**

```python
try:
    response = await async_client.payments_api.create_pay_pal_order(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
    )
    # TODO: Handle 'response' of type PayPalOrderResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreatePayPalOrderErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PayPalOrderResponse](quartermaster_ai_trust_rail_api/models/pay_pal_order_response.py)</code> -- Create (or return) the PayPal sandbox order for an intent

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[CreatePayPalOrderErrorBody](quartermaster_ai_trust_rail_api/errors/create_pay_pal_order_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_payment(id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> PaymentDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Verified payment state.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.payments_api.get_payment(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type PaymentDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPaymentErrorBody
```

**Async**

```python
try:
    response = await async_client.payments_api.get_payment(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type PaymentDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPaymentErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PaymentDto](quartermaster_ai_trust_rail_api/models/payment_dto.py)</code> -- Verified payment state

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetPaymentErrorBody](quartermaster_ai_trust_rail_api/errors/get_payment_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def receive_pay_pal_webhook(*, request_options: RequestOptionsOrDict | None = None) -> WebhookAckResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

PayPal webhook receiver (signature-verified).

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.payments_api.receive_pay_pal_webhook()
    # TODO: Handle 'response' of type WebhookAckResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReceivePayPalWebhookErrorBody
```

**Async**

```python
try:
    response = await async_client.payments_api.receive_pay_pal_webhook()
    # TODO: Handle 'response' of type WebhookAckResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReceivePayPalWebhookErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[WebhookAckResponse](quartermaster_ai_trust_rail_api/models/webhook_ack_response.py)</code> -- PayPal webhook receiver (signature-verified)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ReceivePayPalWebhookErrorBody](quartermaster_ai_trust_rail_api/errors/receive_pay_pal_webhook_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def refund_payment(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: RefundRequest | RefundRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> PaymentsRefundResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Owner-authorized refund. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.payments_api.refund_payment(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        RefundRequest(reason="Damaged on arrival"),
    )
    # TODO: Handle 'response' of type PaymentsRefundResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RefundPaymentErrorBody
```

**Async**

```python
try:
    response = await async_client.payments_api.refund_payment(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        RefundRequest(reason="Damaged on arrival"),
    )
    # TODO: Handle 'response' of type PaymentsRefundResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RefundPaymentErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[RefundRequest](quartermaster_ai_trust_rail_api/models/refund_request.py) \| [RefundRequestDict](quartermaster_ai_trust_rail_api/models/refund_request.py)</code> | Refund part or all of a captured payment. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PaymentsRefundResponse](quartermaster_ai_trust_rail_api/models/payments_refund_response.py)</code> -- Owner-authorized refund

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[RefundPaymentErrorBody](quartermaster_ai_trust_rail_api/errors/refund_payment_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def sync_payment(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> PaymentDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.payments_api.sync_payment(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type PaymentDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SyncPaymentErrorBody
```

**Async**

```python
try:
    response = await async_client.payments_api.sync_payment(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type PaymentDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SyncPaymentErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PaymentDto](quartermaster_ai_trust_rail_api/models/payment_dto.py)</code> -- Re-read the PayPal order and apply its state (never captures)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[SyncPaymentErrorBody](quartermaster_ai_trust_rail_api/errors/sync_payment_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Procurement

> Source: [Procurement](quartermaster_ai_trust_rail_api/apis/procurement.py)

<details>
<summary><code>def approve_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: ApproveRequest | ApproveRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestsApproveResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.approve_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        ApproveRequest(
            purchase_order_id=UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
            cart_hash="sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f",
            acknowledged_review_codes=["MARKET_REFERENCE_UNAVAILABLE"],
        ),
    )
    # TODO: Handle 'response' of type ProcurementRequestsApproveResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ApproveProcurementRequestErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.approve_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        ApproveRequest(
            purchase_order_id=UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
            cart_hash="sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f",
            acknowledged_review_codes=["MARKET_REFERENCE_UNAVAILABLE"],
        ),
    )
    # TODO: Handle 'response' of type ProcurementRequestsApproveResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ApproveProcurementRequestErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[ApproveRequest](quartermaster_ai_trust_rail_api/models/approve_request.py) \| [ApproveRequestDict](quartermaster_ai_trust_rail_api/models/approve_request.py)</code> | The owner's approval of one exact proposal, bound to the cart hash they saw. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestsApproveResponse](quartermaster_ai_trust_rail_api/models/procurement_requests_approve_response.py)</code> -- Approve an exact cart, sign an Intent Certificate and reserve budget

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ApproveProcurementRequestErrorBody](quartermaster_ai_trust_rail_api/errors/approve_procurement_request_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def create_procurement_request(x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: CreateProcurementRequest | CreateProcurementRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Submit a natural-language request. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.create_procurement_request(
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        CreateProcurementRequest(
            instruction="We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.",
            currency=Currency.USD,
            allow_alternatives=True,
        ),
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateProcurementRequestErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.create_procurement_request(
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        CreateProcurementRequest(
            instruction="We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.",
            currency=Currency.USD,
            allow_alternatives=True,
        ),
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateProcurementRequestErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[CreateProcurementRequest](quartermaster_ai_trust_rail_api/models/create_procurement_request.py) \| [CreateProcurementRequestDict](quartermaster_ai_trust_rail_api/models/create_procurement_request.py)</code> | A natural-language purchasing instruction for the agent. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestDto](quartermaster_ai_trust_rail_api/models/procurement_request_dto.py)</code> -- Submit a natural-language request

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[CreateProcurementRequestErrorBody](quartermaster_ai_trust_rail_api/errors/create_procurement_request_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def evaluate_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Re-run TrustRail on open proposals. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.evaluate_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type EvaluateProcurementRequestErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.evaluate_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type EvaluateProcurementRequestErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestDto](quartermaster_ai_trust_rail_api/models/procurement_request_dto.py)</code> -- Re-run TrustRail on open proposals

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[EvaluateProcurementRequestErrorBody](quartermaster_ai_trust_rail_api/errors/evaluate_procurement_request_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_procurement_request(id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Request with forecast, market evidence, candidates, proposals and TrustRail decisions.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.get_procurement_request(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetProcurementRequestErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.get_procurement_request(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetProcurementRequestErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestDto](quartermaster_ai_trust_rail_api/models/procurement_request_dto.py)</code> -- Request with forecast, market evidence, candidates, proposals and TrustRail decisions

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetProcurementRequestErrorBody](quartermaster_ai_trust_rail_api/errors/get_procurement_request_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_procurement_requests(*, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

List procurement requests.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.list_procurement_requests()
    # TODO: Handle 'response' of type ProcurementRequestsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListProcurementRequestsErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.list_procurement_requests()
    # TODO: Handle 'response' of type ProcurementRequestsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListProcurementRequestsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestsResponse](quartermaster_ai_trust_rail_api/models/procurement_requests_response.py)</code> -- List procurement requests

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListProcurementRequestsErrorBody](quartermaster_ai_trust_rail_api/errors/list_procurement_requests_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def reject_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, body: RejectRequest | RejectRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.reject_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        RejectRequest(reason="Not needed this week"),
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RejectProcurementRequestErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.reject_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        RejectRequest(reason="Not needed this week"),
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RejectProcurementRequestErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[RejectRequest](quartermaster_ai_trust_rail_api/models/reject_request.py) \| [RejectRequestDict](quartermaster_ai_trust_rail_api/models/reject_request.py)</code> | Reject one proposal, or every open proposal on the request. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestDto](quartermaster_ai_trust_rail_api/models/procurement_request_dto.py)</code> -- Reject one proposal (purchase_order_id) or every open proposal

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[RejectProcurementRequestErrorBody](quartermaster_ai_trust_rail_api/errors/reject_procurement_request_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def research_procurement_request(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> ProcurementRequestDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.procurement.research_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ResearchProcurementRequestErrorBody
```

**Async**

```python
try:
    response = await async_client.procurement.research_procurement_request(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type ProcurementRequestDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ResearchProcurementRequestErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProcurementRequestDto](quartermaster_ai_trust_rail_api/models/procurement_request_dto.py)</code> -- Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ResearchProcurementRequestErrorBody](quartermaster_ai_trust_rail_api/errors/research_procurement_request_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## SecurityApi

> Source: [SecurityApi](quartermaster_ai_trust_rail_api/apis/security_api.py)

<details>
<summary><code>def get_pay_pal_notification_status(*, request_options: RequestOptionsOrDict | None = None) -> SecurityPaypalNotificationsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Whether PayPal's signed notifications are arriving.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.security_api.get_pay_pal_notification_status()
    # TODO: Handle 'response' of type SecurityPaypalNotificationsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPayPalNotificationStatusErrorBody
```

**Async**

```python
try:
    response = await async_client.security_api.get_pay_pal_notification_status()
    # TODO: Handle 'response' of type SecurityPaypalNotificationsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPayPalNotificationStatusErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SecurityPaypalNotificationsResponse](quartermaster_ai_trust_rail_api/models/security_paypal_notifications_response.py)</code> -- Whether PayPal's signed notifications are arriving

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetPayPalNotificationStatusErrorBody](quartermaster_ai_trust_rail_api/errors/get_pay_pal_notification_status_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_audit_events(*, request_options: RequestOptionsOrDict | None = None) -> SecurityAuditResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Hash-chained audit log.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.security_api.list_audit_events()
    # TODO: Handle 'response' of type SecurityAuditResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListAuditEventsErrorBody
```

**Async**

```python
try:
    response = await async_client.security_api.list_audit_events()
    # TODO: Handle 'response' of type SecurityAuditResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListAuditEventsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SecurityAuditResponse](quartermaster_ai_trust_rail_api/models/security_audit_response.py)</code> -- Hash-chained audit log

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListAuditEventsErrorBody](quartermaster_ai_trust_rail_api/errors/list_audit_events_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_policy_decisions(*, request_options: RequestOptionsOrDict | None = None) -> SecurityDecisionsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Policy decisions.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.security_api.list_policy_decisions()
    # TODO: Handle 'response' of type SecurityDecisionsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListPolicyDecisionsErrorBody
```

**Async**

```python
try:
    response = await async_client.security_api.list_policy_decisions()
    # TODO: Handle 'response' of type SecurityDecisionsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListPolicyDecisionsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SecurityDecisionsResponse](quartermaster_ai_trust_rail_api/models/security_decisions_response.py)</code> -- Policy decisions

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListPolicyDecisionsErrorBody](quartermaster_ai_trust_rail_api/errors/list_policy_decisions_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_security_findings(*, request_options: RequestOptionsOrDict | None = None) -> SecurityEventsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

TrustRail findings and evidence.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.security_api.list_security_findings()
    # TODO: Handle 'response' of type SecurityEventsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListSecurityFindingsErrorBody
```

**Async**

```python
try:
    response = await async_client.security_api.list_security_findings()
    # TODO: Handle 'response' of type SecurityEventsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListSecurityFindingsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SecurityEventsResponse](quartermaster_ai_trust_rail_api/models/security_events_response.py)</code> -- TrustRail findings and evidence

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListSecurityFindingsErrorBody](quartermaster_ai_trust_rail_api/errors/list_security_findings_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_audit_chain(*, request_options: RequestOptionsOrDict | None = None) -> AuditChainVerificationDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Verify the audit hash chain. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.security_api.verify_audit_chain()
    # TODO: Handle 'response' of type AuditChainVerificationDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyAuditChainErrorBody
```

**Async**

```python
try:
    response = await async_client.security_api.verify_audit_chain()
    # TODO: Handle 'response' of type AuditChainVerificationDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyAuditChainErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AuditChainVerificationDto](quartermaster_ai_trust_rail_api/models/audit_chain_verification_dto.py)</code> -- Verify the audit hash chain

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[VerifyAuditChainErrorBody](quartermaster_ai_trust_rail_api/errors/verify_audit_chain_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Suppliers

> Source: [Suppliers](quartermaster_ai_trust_rail_api/apis/suppliers.py)

<details>
<summary><code>def create_catalog_item(id_: UUID, x_requested_with: XRequestedWithOrStr, body: CatalogItemInput | CatalogItemInputDict, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersCatalogResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Add a catalog listing (screened for prompt injection). Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.suppliers.create_catalog_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        CatalogItemInput(
            sku="BB-COLA-24",
            title="Cola, 24 x 12 oz cans",
            description="Classic cola",
            category=Category.BEVERAGES,
            inventory_item_id=UUID("00000000-0000-0000-0000-000000000000"),
            pack_quantity=24,
            unit_price_minor=1499,
            in_stock=True,
            recurring=False,
        ),
    )
    # TODO: Handle 'response' of type SuppliersCatalogResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateCatalogItemErrorBody
```

**Async**

```python
try:
    response = await async_client.suppliers.create_catalog_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        CatalogItemInput(
            sku="BB-COLA-24",
            title="Cola, 24 x 12 oz cans",
            description="Classic cola",
            category=Category.BEVERAGES,
            inventory_item_id=UUID("00000000-0000-0000-0000-000000000000"),
            pack_quantity=24,
            unit_price_minor=1499,
            in_stock=True,
            recurring=False,
        ),
    )
    # TODO: Handle 'response' of type SuppliersCatalogResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateCatalogItemErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CatalogItemInput](quartermaster_ai_trust_rail_api/models/catalog_item_input.py) \| [CatalogItemInputDict](quartermaster_ai_trust_rail_api/models/catalog_item_input.py)</code> | Fields for creating or updating a catalog listing. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SuppliersCatalogResponse](quartermaster_ai_trust_rail_api/models/suppliers_catalog_response.py)</code> -- Add a catalog listing (screened for prompt injection)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[CreateCatalogItemErrorBody](quartermaster_ai_trust_rail_api/errors/create_catalog_item_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def create_supplier(x_requested_with: XRequestedWithOrStr, body: SupplierInput | SupplierInputDict, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse1</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.suppliers.create_supplier(
        XRequestedWith.QUARTERMASTER,
        SupplierInput(
            name="Bayside Beverages",
            website="https://bayside.example.com",
            description="Local drinks distributor",
            lead_time_days=2,
            tax_rate_bps=825,
            fee_terms=[
                FeeTerm(
                    code="SHIP_STD", label="Delivery", kind=Kind1.SHIPPING, amount_minor=900, waived_over_minor=15000
                ),
            ],
            active=True,
            checkout_eligible=True,
        ),
    )
    # TODO: Handle 'response' of type SuppliersResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateSupplierErrorBody
```

**Async**

```python
try:
    response = await async_client.suppliers.create_supplier(
        XRequestedWith.QUARTERMASTER,
        SupplierInput(
            name="Bayside Beverages",
            website="https://bayside.example.com",
            description="Local drinks distributor",
            lead_time_days=2,
            tax_rate_bps=825,
            fee_terms=[
                FeeTerm(
                    code="SHIP_STD", label="Delivery", kind=Kind1.SHIPPING, amount_minor=900, waived_over_minor=15000
                ),
            ],
            active=True,
            checkout_eligible=True,
        ),
    )
    # TODO: Handle 'response' of type SuppliersResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateSupplierErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[SupplierInput](quartermaster_ai_trust_rail_api/models/supplier_input.py) \| [SupplierInputDict](quartermaster_ai_trust_rail_api/models/supplier_input.py)</code> | Fields for creating or updating a supplier. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SuppliersResponse1](quartermaster_ai_trust_rail_api/models/suppliers_response1.py)</code> -- Add a supplier (owners approve it in the Spend Mandate)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[CreateSupplierErrorBody](quartermaster_ai_trust_rail_api/errors/create_supplier_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_supplier(id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse1</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Supplier with its catalog.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.suppliers.get_supplier(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type SuppliersResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetSupplierErrorBody
```

**Async**

```python
try:
    response = await async_client.suppliers.get_supplier(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type SuppliersResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetSupplierErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SuppliersResponse1](quartermaster_ai_trust_rail_api/models/suppliers_response1.py)</code> -- Supplier with its catalog

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetSupplierErrorBody](quartermaster_ai_trust_rail_api/errors/get_supplier_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_suppliers(*, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Suppliers with mandate approval and catalog size.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.suppliers.list_suppliers()
    # TODO: Handle 'response' of type SuppliersResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListSuppliersErrorBody
```

**Async**

```python
try:
    response = await async_client.suppliers.list_suppliers()
    # TODO: Handle 'response' of type SuppliersResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListSuppliersErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SuppliersResponse](quartermaster_ai_trust_rail_api/models/suppliers_response.py)</code> -- Suppliers with mandate approval and catalog size

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListSuppliersErrorBody](quartermaster_ai_trust_rail_api/errors/list_suppliers_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def update_catalog_item(id_: UUID, item_id: UUID, x_requested_with: XRequestedWithOrStr, body: CatalogItemInput | CatalogItemInputDict, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersCatalogResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Update a catalog listing. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.suppliers.update_catalog_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        CatalogItemInput(
            sku="some example string",
            title="some example string",
            category=Category.FOOD_PACKAGING,
            pack_quantity=1,
            unit_price_minor=1,
        ),
    )
    # TODO: Handle 'response' of type SuppliersCatalogResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateCatalogItemErrorBody
```

**Async**

```python
try:
    response = await async_client.suppliers.update_catalog_item(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        CatalogItemInput(
            sku="some example string",
            title="some example string",
            category=Category.FOOD_PACKAGING,
            pack_quantity=1,
            unit_price_minor=1,
        ),
    )
    # TODO: Handle 'response' of type SuppliersCatalogResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateCatalogItemErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>item_id</code> | <code>UUID</code> | itemId id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CatalogItemInput](quartermaster_ai_trust_rail_api/models/catalog_item_input.py) \| [CatalogItemInputDict](quartermaster_ai_trust_rail_api/models/catalog_item_input.py)</code> | Fields for creating or updating a catalog listing. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SuppliersCatalogResponse](quartermaster_ai_trust_rail_api/models/suppliers_catalog_response.py)</code> -- Update a catalog listing

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[UpdateCatalogItemErrorBody](quartermaster_ai_trust_rail_api/errors/update_catalog_item_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def update_supplier(id_: UUID, x_requested_with: XRequestedWithOrStr, body: SupplierInput | SupplierInputDict, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse1</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Update a supplier. Requires the MANAGER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.suppliers.update_supplier(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        SupplierInput(name="some example string", lead_time_days=1, tax_rate_bps=1),
    )
    # TODO: Handle 'response' of type SuppliersResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateSupplierErrorBody
```

**Async**

```python
try:
    response = await async_client.suppliers.update_supplier(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        SupplierInput(name="some example string", lead_time_days=1, tax_rate_bps=1),
    )
    # TODO: Handle 'response' of type SuppliersResponse1
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateSupplierErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[SupplierInput](quartermaster_ai_trust_rail_api/models/supplier_input.py) \| [SupplierInputDict](quartermaster_ai_trust_rail_api/models/supplier_input.py)</code> | Fields for creating or updating a supplier. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[SuppliersResponse1](quartermaster_ai_trust_rail_api/models/suppliers_response1.py)</code> -- Update a supplier

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[UpdateSupplierErrorBody](quartermaster_ai_trust_rail_api/errors/update_supplier_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## System

> Source: [System](quartermaster_ai_trust_rail_api/apis/system.py)

<details>
<summary><code>def get_public_config(*, request_options: RequestOptionsOrDict | None = None) -> PublicConfig</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Feature flags and PayPal client id.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.system.get_public_config()
    # TODO: Handle 'response' of type PublicConfig
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPublicConfigErrorBody
```

**Async**

```python
try:
    response = await async_client.system.get_public_config()
    # TODO: Handle 'response' of type PublicConfig
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPublicConfigErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[PublicConfig](quartermaster_ai_trust_rail_api/models/public_config.py)</code> -- Feature flags and PayPal client id

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetPublicConfigErrorBody](quartermaster_ai_trust_rail_api/errors/get_public_config_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def report_client_error(x_requested_with: XRequestedWithOrStr, body: ClientErrorReport | ClientErrorReportDict, *, request_options: RequestOptionsOrDict | None = None) -> ClientErrorsResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Report a browser error to error tracking.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.system.report_client_error(
        XRequestedWith.QUARTERMASTER,
        ClientErrorReport(message="TypeError: x is undefined", path="/orders", kind=Kind.RENDER),
    )
    # TODO: Handle 'response' of type ClientErrorsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReportClientErrorBody
```

**Async**

```python
try:
    response = await async_client.system.report_client_error(
        XRequestedWith.QUARTERMASTER,
        ClientErrorReport(message="TypeError: x is undefined", path="/orders", kind=Kind.RENDER),
    )
    # TODO: Handle 'response' of type ClientErrorsResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReportClientErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[ClientErrorReport](quartermaster_ai_trust_rail_api/models/client_error_report.py) \| [ClientErrorReportDict](quartermaster_ai_trust_rail_api/models/client_error_report.py)</code> | A browser error reported for error tracking. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ClientErrorsResponse](quartermaster_ai_trust_rail_api/models/client_errors_response.py)</code> -- Report a browser error to error tracking

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ReportClientErrorBody](quartermaster_ai_trust_rail_api/errors/report_client_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Team

> Source: [Team](quartermaster_ai_trust_rail_api/apis/team.py)

<details>
<summary><code>def accept_invitation(x_requested_with: XRequestedWithOrStr, body: AcceptInvitationRequest | AcceptInvitationRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> InvitationsAcceptResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Accept an invitation, create the account and sign in.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.accept_invitation(
        XRequestedWith.QUARTERMASTER,
        AcceptInvitationRequest(
            token="Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu", name="Sam Manager", password="a-new-strong-passphrase"
        ),
    )
    # TODO: Handle 'response' of type InvitationsAcceptResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type AcceptInvitationErrorBody
```

**Async**

```python
try:
    response = await async_client.team.accept_invitation(
        XRequestedWith.QUARTERMASTER,
        AcceptInvitationRequest(
            token="Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu", name="Sam Manager", password="a-new-strong-passphrase"
        ),
    )
    # TODO: Handle 'response' of type InvitationsAcceptResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type AcceptInvitationErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[AcceptInvitationRequest](quartermaster_ai_trust_rail_api/models/accept_invitation_request.py) \| [AcceptInvitationRequestDict](quartermaster_ai_trust_rail_api/models/accept_invitation_request.py)</code> | Accept an invitation: the invitee's name and new password, with the link token. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InvitationsAcceptResponse](quartermaster_ai_trust_rail_api/models/invitations_accept_response.py)</code> -- Accept an invitation, create the account and sign in

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[AcceptInvitationErrorBody](quartermaster_ai_trust_rail_api/errors/accept_invitation_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def invite_member(x_requested_with: XRequestedWithOrStr, body: CreateInvitationRequest | CreateInvitationRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> InvitationCreatedResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.invite_member(
        XRequestedWith.QUARTERMASTER, CreateInvitationRequest(email="sam@example.com", role=Role1.MANAGER)
    )
    # TODO: Handle 'response' of type InvitationCreatedResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type InviteMemberErrorBody
```

**Async**

```python
try:
    response = await async_client.team.invite_member(
        XRequestedWith.QUARTERMASTER, CreateInvitationRequest(email="sam@example.com", role=Role1.MANAGER)
    )
    # TODO: Handle 'response' of type InvitationCreatedResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type InviteMemberErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[CreateInvitationRequest](quartermaster_ai_trust_rail_api/models/create_invitation_request.py) \| [CreateInvitationRequestDict](quartermaster_ai_trust_rail_api/models/create_invitation_request.py)</code> | Invite an email address with a role. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InvitationCreatedResponse](quartermaster_ai_trust_rail_api/models/invitation_created_response.py)</code> -- Invite someone (returns the one-time link; emailed when email is configured)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[InviteMemberErrorBody](quartermaster_ai_trust_rail_api/errors/invite_member_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def issue_member_reset_link(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> ResetLinkResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Issue a one-time password reset link for a member. Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.issue_member_reset_link(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type ResetLinkResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type IssueMemberResetLinkErrorBody
```

**Async**

```python
try:
    response = await async_client.team.issue_member_reset_link(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type ResetLinkResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type IssueMemberResetLinkErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ResetLinkResponse](quartermaster_ai_trust_rail_api/models/reset_link_response.py)</code> -- Issue a one-time password reset link for a member

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[IssueMemberResetLinkErrorBody](quartermaster_ai_trust_rail_api/errors/issue_member_reset_link_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_members(*, request_options: RequestOptionsOrDict | None = None) -> MembersResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Members, and open invitations for owners.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.list_members()
    # TODO: Handle 'response' of type MembersResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListMembersErrorBody
```

**Async**

```python
try:
    response = await async_client.team.list_members()
    # TODO: Handle 'response' of type MembersResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListMembersErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[MembersResponse](quartermaster_ai_trust_rail_api/models/members_response.py)</code> -- Members, and open invitations for owners

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[ListMembersErrorBody](quartermaster_ai_trust_rail_api/errors/list_members_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def lookup_invitation(x_requested_with: XRequestedWithOrStr, body: InvitationTokenRequest | InvitationTokenRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> InvitationsLookupResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Preview an invitation from its link token.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.lookup_invitation(
        XRequestedWith.QUARTERMASTER, InvitationTokenRequest(token="Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu")
    )
    # TODO: Handle 'response' of type InvitationsLookupResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type LookupInvitationErrorBody
```

**Async**

```python
try:
    response = await async_client.team.lookup_invitation(
        XRequestedWith.QUARTERMASTER, InvitationTokenRequest(token="Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu")
    )
    # TODO: Handle 'response' of type InvitationsLookupResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type LookupInvitationErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[InvitationTokenRequest](quartermaster_ai_trust_rail_api/models/invitation_token_request.py) \| [InvitationTokenRequestDict](quartermaster_ai_trust_rail_api/models/invitation_token_request.py)</code> | An invitation link token. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[InvitationsLookupResponse](quartermaster_ai_trust_rail_api/models/invitations_lookup_response.py)</code> -- Preview an invitation from its link token

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[LookupInvitationErrorBody](quartermaster_ai_trust_rail_api/errors/lookup_invitation_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def remove_member(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> None</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Remove a member. Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    client.team.remove_member(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER)
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RemoveMemberErrorBody
```

**Async**

```python
try:
    await async_client.team.remove_member(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER)
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RemoveMemberErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: No content

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[RemoveMemberErrorBody](quartermaster_ai_trust_rail_api/errors/remove_member_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def revoke_invitation(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None) -> MembersInvitationsRevokeResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Revoke an open invitation. Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.revoke_invitation(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER)
    # TODO: Handle 'response' of type MembersInvitationsRevokeResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RevokeInvitationErrorBody
```

**Async**

```python
try:
    response = await async_client.team.revoke_invitation(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"), XRequestedWith.QUARTERMASTER
    )
    # TODO: Handle 'response' of type MembersInvitationsRevokeResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RevokeInvitationErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[MembersInvitationsRevokeResponse](quartermaster_ai_trust_rail_api/models/members_invitations_revoke_response.py)</code> -- Revoke an open invitation

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[RevokeInvitationErrorBody](quartermaster_ai_trust_rail_api/errors/revoke_invitation_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def update_member_role(id_: UUID, x_requested_with: XRequestedWithOrStr, body: UpdateMemberRoleRequest | UpdateMemberRoleRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> MembersRoleResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.team.update_member_role(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        UpdateMemberRoleRequest(role=Role1.VIEWER),
    )
    # TODO: Handle 'response' of type MembersRoleResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateMemberRoleErrorBody
```

**Async**

```python
try:
    response = await async_client.team.update_member_role(
        UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
        XRequestedWith.QUARTERMASTER,
        UpdateMemberRoleRequest(role=Role1.VIEWER),
    )
    # TODO: Handle 'response' of type MembersRoleResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateMemberRoleErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>body</code> | <code>[UpdateMemberRoleRequest](quartermaster_ai_trust_rail_api/models/update_member_role_request.py) \| [UpdateMemberRoleRequestDict](quartermaster_ai_trust_rail_api/models/update_member_role_request.py)</code> | A member's new role. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[MembersRoleResponse](quartermaster_ai_trust_rail_api/models/members_role_response.py)</code> -- Change a member's role (a workspace keeps at least one owner)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[UpdateMemberRoleErrorBody](quartermaster_ai_trust_rail_api/errors/update_member_role_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 409, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## TrustRail

> Source: [TrustRail](quartermaster_ai_trust_rail_api/apis/trust_rail.py)

<details>
<summary><code>def get_spend_mandate(*, request_options: RequestOptionsOrDict | None = None) -> MandatesCurrentResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Active Spend Mandate and weekly budget.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.trust_rail.get_spend_mandate()
    # TODO: Handle 'response' of type MandatesCurrentResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetSpendMandateErrorBody
```

**Async**

```python
try:
    response = await async_client.trust_rail.get_spend_mandate()
    # TODO: Handle 'response' of type MandatesCurrentResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetSpendMandateErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[MandatesCurrentResponse](quartermaster_ai_trust_rail_api/models/mandates_current_response.py)</code> -- Active Spend Mandate and weekly budget

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[GetSpendMandateErrorBody](quartermaster_ai_trust_rail_api/errors/get_spend_mandate_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def update_spend_mandate(x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: SpendMandateInput | SpendMandateInputDict, *, request_options: RequestOptionsOrDict | None = None) -> MandateUpdateResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.trust_rail.update_spend_mandate(
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        SpendMandateInput(
            weekly_budget_minor=1,
            per_order_limit_minor=1,
            auto_approval_limit_minor=1,
            human_approval_required=True,
            approved_supplier_ids=[UUID("00000000-0000-0000-0000-000000000000")],
            allowed_categories=[AllowedCategory.FOOD_PACKAGING],
            max_market_price_premium_pct=1,
            market_price_action=MarketPriceAction.REVIEW,
            duplicate_window_hours=1,
            duplicate_action=DuplicateAction.REVIEW,
            subscriptions_allowed=True,
            certificate_ttl_minutes=1,
            max_quantity_multiple_of_need=1.5,
            expected_version=1,
        ),
    )
    # TODO: Handle 'response' of type MandateUpdateResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateSpendMandateErrorBody
```

**Async**

```python
try:
    response = await async_client.trust_rail.update_spend_mandate(
        XRequestedWith.QUARTERMASTER,
        "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
        SpendMandateInput(
            weekly_budget_minor=1,
            per_order_limit_minor=1,
            auto_approval_limit_minor=1,
            human_approval_required=True,
            approved_supplier_ids=[UUID("00000000-0000-0000-0000-000000000000")],
            allowed_categories=[AllowedCategory.FOOD_PACKAGING],
            max_market_price_premium_pct=1,
            market_price_action=MarketPriceAction.REVIEW,
            duplicate_window_hours=1,
            duplicate_action=DuplicateAction.REVIEW,
            subscriptions_allowed=True,
            certificate_ttl_minutes=1,
            max_quantity_multiple_of_need=1.5,
            expected_version=1,
        ),
    )
    # TODO: Handle 'response' of type MandateUpdateResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type UpdateSpendMandateErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>x_requested_with</code> | <code>[XRequestedWithOrStr](quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py)</code> | CSRF guard: must be `quartermaster` on every mutation. |
| <code>idempotency_key</code> | <code>str</code> | A unique key per user action; retries with the same key return the first result. |
| <code>body</code> | <code>[SpendMandateInput](quartermaster_ai_trust_rail_api/models/spend_mandate_input.py) \| [SpendMandateInputDict](quartermaster_ai_trust_rail_api/models/spend_mandate_input.py)</code> | A new Spend Mandate version (optimistic concurrency on `expected_version`). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[MandateUpdateResponse](quartermaster_ai_trust_rail_api/models/mandate_update_response.py)</code> -- Publish a new mandate version (revokes approvals if tightened)

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[UpdateSpendMandateErrorBody](quartermaster_ai_trust_rail_api/errors/update_spend_mandate_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 409, 422, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_intent_certificate(id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> CertificateVerificationDto</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Verify an Intent Certificate against the live cart.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.trust_rail.verify_intent_certificate(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type CertificateVerificationDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyIntentCertificateErrorBody
```

**Async**

```python
try:
    response = await async_client.trust_rail.verify_intent_certificate(UUID("0f8fad5b-d9cb-469f-a165-70867728950e"))
    # TODO: Handle 'response' of type CertificateVerificationDto
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyIntentCertificateErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>UUID</code> | Resource id (UUID). |
| <code>request_options</code> | <code>[RequestOptionsOrDict](quartermaster_ai_trust_rail_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[CertificateVerificationDto](quartermaster_ai_trust_rail_api/models/certificate_verification_dto.py)</code> -- Verify an Intent Certificate against the live cart

**OnError**: <code>[ApiError](quartermaster_ai_trust_rail_api/core/exceptions.py)&#91;[VerifyIntentCertificateErrorBody](quartermaster_ai_trust_rail_api/errors/verify_intent_certificate_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 403, 404, 429 | <code>[ApiErrorModel](quartermaster_ai_trust_rail_api/models/api_error_model.py)</code> |
| anything unmapped | <code>[RawError](quartermaster_ai_trust_rail_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

