from __future__ import annotations

from uuid import UUID, uuid4

from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import (
    AnySchemes,
    ApiResult,
    AsyncAnySchemes,
    AsyncRawClient,
    RawClient,
    RequestOptionsOrDict,
    SecuredRawResponse,
    async_empty_response,
    async_json_decoder,
    empty_response,
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.change_password_error import ChangePasswordErrorBody, change_password_error_mapper
from ..errors.get_current_user_error import GetCurrentUserErrorBody, get_current_user_error_mapper
from ..errors.login_error import LoginErrorBody, login_error_mapper
from ..errors.logout_error import LogoutErrorBody, logout_error_mapper
from ..errors.request_password_reset_error import RequestPasswordResetErrorBody, request_password_reset_error_mapper
from ..errors.reset_password_error import ResetPasswordErrorBody, reset_password_error_mapper
from ..errors.signup_error import SignupErrorBody, signup_error_mapper
from ..models.auth_login_response import AuthLoginResponse
from ..models.auth_me_response import AuthMeResponse
from ..models.auth_password_change_response import AuthPasswordChangeResponse
from ..models.auth_password_forgot_response import AuthPasswordForgotResponse
from ..models.auth_password_reset_response import AuthPasswordResetResponse
from ..models.auth_signup_response import AuthSignupResponse
from ..models.change_password_request import ChangePasswordRequest, ChangePasswordRequestDict
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.forgot_password_request import ForgotPasswordRequest, ForgotPasswordRequestDict
from ..models.login_request import LoginRequest, LoginRequestDict
from ..models.reset_password_request import ResetPasswordRequest, ResetPasswordRequestDict
from ..models.signup_request import SignupRequest, SignupRequestDict
from ..server.server import Server


class AccountsApi:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = AccountsApiWithRawResponse(client, server, auth)

    def change_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ChangePasswordRequest | ChangePasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthPasswordChangeResponse:
        """Change your password (signs out other sessions).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Change the signed-in user's password.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Change your password (signs out other sessions)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.change_password(x_requested_with, body, request_options=request_options))

    def get_current_user(self, *, request_options: RequestOptionsOrDict | None = None) -> AuthMeResponse:
        """Current user and organization.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Current user and organization

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_current_user(request_options=request_options))

    def login(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: LoginRequest | LoginRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthLoginResponse:
        """Sign in (sets httpOnly session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Email and password sign-in.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Sign in (sets httpOnly session cookie)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(self._with_raw_response.login(x_requested_with, body, request_options=request_options))

    def logout(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> None:
        """Sign out.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Done; no content.

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.logout(x_requested_with, request_options=request_options))

    def request_password_reset(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForgotPasswordRequest | ForgotPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthPasswordForgotResponse:
        """Email a password reset link (always 202).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Request a password reset email.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Email a password reset link (always 202)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            self._with_raw_response.request_password_reset(x_requested_with, body, request_options=request_options)
        )

    def reset_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ResetPasswordRequest | ResetPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthPasswordResetResponse:
        """Set a new password from a one-time link.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Set a new password from a one-time reset link.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Set a new password from a one-time link

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(self._with_raw_response.reset_password(x_requested_with, body, request_options=request_options))

    def signup(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SignupRequest | SignupRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthSignupResponse:
        """Create a workspace and its owner (sets session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Create a workspace and its first owner.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Create a workspace and its owner (sets session cookie)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(self._with_raw_response.signup(x_requested_with, body, request_options=request_options))

    @property
    def with_raw_response(self) -> AccountsApiWithRawResponse:
        return self._with_raw_response


class AsyncAccountsApi:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncAccountsApiWithRawResponse(client, server, auth)

    async def change_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ChangePasswordRequest | ChangePasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthPasswordChangeResponse:
        """Change your password (signs out other sessions).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Change the signed-in user's password.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Change your password (signs out other sessions)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.change_password(x_requested_with, body, request_options=request_options)
        )

    async def get_current_user(self, *, request_options: RequestOptionsOrDict | None = None) -> AuthMeResponse:
        """Current user and organization.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Current user and organization

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_current_user(request_options=request_options))

    async def login(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: LoginRequest | LoginRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthLoginResponse:
        """Sign in (sets httpOnly session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Email and password sign-in.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Sign in (sets httpOnly session cookie)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(await self._with_raw_response.login(x_requested_with, body, request_options=request_options))

    async def logout(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> None:
        """Sign out.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Done; no content.

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.logout(x_requested_with, request_options=request_options))

    async def request_password_reset(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForgotPasswordRequest | ForgotPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthPasswordForgotResponse:
        """Email a password reset link (always 202).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Request a password reset email.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Email a password reset link (always 202)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            await self._with_raw_response.request_password_reset(
                x_requested_with, body, request_options=request_options
            ),
        )

    async def reset_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ResetPasswordRequest | ResetPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthPasswordResetResponse:
        """Set a new password from a one-time link.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Set a new password from a one-time reset link.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Set a new password from a one-time link

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            await self._with_raw_response.reset_password(x_requested_with, body, request_options=request_options)
        )

    async def signup(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SignupRequest | SignupRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> AuthSignupResponse:
        """Create a workspace and its owner (sets session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Create a workspace and its first owner.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Create a workspace and its owner (sets session cookie)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(await self._with_raw_response.signup(x_requested_with, body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncAccountsApiWithRawResponse:
        return self._with_raw_response


class AccountsApiWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def change_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ChangePasswordRequest | ChangePasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthPasswordChangeResponse, ChangePasswordErrorBody]:
        """Change your password (signs out other sessions).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Change the signed-in user's password.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/password/change"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ChangePasswordRequest | ChangePasswordRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[AuthPasswordChangeResponse],
            error_mapper=change_password_error_mapper,
            request_options=request_options,
        )

    def get_current_user(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AuthMeResponse, GetCurrentUserErrorBody]:
        """Current user and organization.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/auth/me"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[AuthMeResponse],
            error_mapper=get_current_user_error_mapper,
            request_options=request_options,
        )

    def login(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: LoginRequest | LoginRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthLoginResponse, LoginErrorBody]:
        """Sign in (sets httpOnly session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Email and password sign-in.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/login"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[LoginRequest | LoginRequestDict](body),
            decoder=json_decoder[AuthLoginResponse],
            error_mapper=login_error_mapper,
            request_options=request_options,
        )

    def logout(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[None, LogoutErrorBody]:
        """Sign out.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/logout"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=empty_response,
            error_mapper=logout_error_mapper,
            request_options=request_options,
        )

    def request_password_reset(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForgotPasswordRequest | ForgotPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthPasswordForgotResponse, RequestPasswordResetErrorBody]:
        """Email a password reset link (always 202).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Request a password reset email.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/password/forgot"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ForgotPasswordRequest | ForgotPasswordRequestDict](body),
            decoder=json_decoder[AuthPasswordForgotResponse],
            error_mapper=request_password_reset_error_mapper,
            request_options=request_options,
        )

    def reset_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ResetPasswordRequest | ResetPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthPasswordResetResponse, ResetPasswordErrorBody]:
        """Set a new password from a one-time link.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Set a new password from a one-time reset link.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/password/reset"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ResetPasswordRequest | ResetPasswordRequestDict](body),
            decoder=json_decoder[AuthPasswordResetResponse],
            error_mapper=reset_password_error_mapper,
            request_options=request_options,
        )

    def signup(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SignupRequest | SignupRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthSignupResponse, SignupErrorBody]:
        """Create a workspace and its owner (sets session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Create a workspace and its first owner.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/signup"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[SignupRequest | SignupRequestDict](body),
            decoder=json_decoder[AuthSignupResponse],
            error_mapper=signup_error_mapper,
            request_options=request_options,
        )


class AsyncAccountsApiWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def change_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ChangePasswordRequest | ChangePasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthPasswordChangeResponse, ChangePasswordErrorBody]:
        """Change your password (signs out other sessions).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Change the signed-in user's password.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/password/change"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ChangePasswordRequest | ChangePasswordRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[AuthPasswordChangeResponse],
            error_mapper=change_password_error_mapper,
            request_options=request_options,
        )

    async def get_current_user(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AuthMeResponse, GetCurrentUserErrorBody]:
        """Current user and organization.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/auth/me"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[AuthMeResponse],
            error_mapper=get_current_user_error_mapper,
            request_options=request_options,
        )

    async def login(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: LoginRequest | LoginRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthLoginResponse, LoginErrorBody]:
        """Sign in (sets httpOnly session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Email and password sign-in.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/login"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[LoginRequest | LoginRequestDict](body),
            decoder=async_json_decoder[AuthLoginResponse],
            error_mapper=login_error_mapper,
            request_options=request_options,
        )

    async def logout(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[None, LogoutErrorBody]:
        """Sign out.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/logout"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_empty_response,
            error_mapper=logout_error_mapper,
            request_options=request_options,
        )

    async def request_password_reset(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForgotPasswordRequest | ForgotPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthPasswordForgotResponse, RequestPasswordResetErrorBody]:
        """Email a password reset link (always 202).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Request a password reset email.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/password/forgot"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ForgotPasswordRequest | ForgotPasswordRequestDict](body),
            decoder=async_json_decoder[AuthPasswordForgotResponse],
            error_mapper=request_password_reset_error_mapper,
            request_options=request_options,
        )

    async def reset_password(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ResetPasswordRequest | ResetPasswordRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthPasswordResetResponse, ResetPasswordErrorBody]:
        """Set a new password from a one-time link.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Set a new password from a one-time reset link.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/password/reset"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ResetPasswordRequest | ResetPasswordRequestDict](body),
            decoder=async_json_decoder[AuthPasswordResetResponse],
            error_mapper=reset_password_error_mapper,
            request_options=request_options,
        )

    async def signup(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SignupRequest | SignupRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[AuthSignupResponse, SignupErrorBody]:
        """Create a workspace and its owner (sets session cookie).

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Create a workspace and its first owner.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/auth/signup"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[SignupRequest | SignupRequestDict](body),
            decoder=async_json_decoder[AuthSignupResponse],
            error_mapper=signup_error_mapper,
            request_options=request_options,
        )
