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
    async_json_decoder,
    json_decoder,
    param,
    unwrap,
)
from ..errors.get_platform_health_error import GetPlatformHealthErrorBody, get_platform_health_error_mapper
from ..errors.list_tracked_errors_error import ListTrackedErrorsErrorBody, list_tracked_errors_error_mapper
from ..errors.resolve_tracked_error import ResolveTrackedErrorBody, resolve_tracked_error_mapper
from ..errors.send_test_alert_error import SendTestAlertErrorBody, send_test_alert_error_mapper
from ..models.alert_test_response import AlertTestResponse
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.ops_errors_resolve_response import OpsErrorsResolveResponse
from ..models.ops_errors_response import OpsErrorsResponse
from ..models.ops_health_dto import OpsHealthDto
from ..server.server import Server


class Operations:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = OperationsWithRawResponse(client, server, auth)

    def get_platform_health(self, *, request_options: RequestOptionsOrDict | None = None) -> OpsHealthDto:
        """Platform health (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Platform health (operators)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_platform_health(request_options=request_options))

    def list_tracked_errors(self, *, request_options: RequestOptionsOrDict | None = None) -> OpsErrorsResponse:
        """Tracked error groups (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Tracked error groups (operators)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_tracked_errors(request_options=request_options))

    def resolve_tracked_error(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> OpsErrorsResolveResponse:
        """Resolve an error group; it reopens and alerts if it recurs.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Resolve an error group; it reopens and alerts if it recurs

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.resolve_tracked_error(id_, x_requested_with, request_options=request_options)
        )

    def send_test_alert(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> AlertTestResponse:
        """Send a test alert to every configured channel.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Send a test alert to every configured channel

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.send_test_alert(x_requested_with, request_options=request_options))

    @property
    def with_raw_response(self) -> OperationsWithRawResponse:
        return self._with_raw_response


class AsyncOperations:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncOperationsWithRawResponse(client, server, auth)

    async def get_platform_health(self, *, request_options: RequestOptionsOrDict | None = None) -> OpsHealthDto:
        """Platform health (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Platform health (operators)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_platform_health(request_options=request_options))

    async def list_tracked_errors(self, *, request_options: RequestOptionsOrDict | None = None) -> OpsErrorsResponse:
        """Tracked error groups (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Tracked error groups (operators)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_tracked_errors(request_options=request_options))

    async def resolve_tracked_error(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> OpsErrorsResolveResponse:
        """Resolve an error group; it reopens and alerts if it recurs.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Resolve an error group; it reopens and alerts if it recurs

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.resolve_tracked_error(id_, x_requested_with, request_options=request_options)
        )

    async def send_test_alert(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> AlertTestResponse:
        """Send a test alert to every configured channel.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Send a test alert to every configured channel

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.send_test_alert(x_requested_with, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncOperationsWithRawResponse:
        return self._with_raw_response


class OperationsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def get_platform_health(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OpsHealthDto, GetPlatformHealthErrorBody]:
        """Platform health (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/ops/health"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[OpsHealthDto],
            error_mapper=get_platform_health_error_mapper,
            request_options=request_options,
        )

    def list_tracked_errors(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OpsErrorsResponse, ListTrackedErrorsErrorBody]:
        """Tracked error groups (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/ops/errors"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[OpsErrorsResponse],
            error_mapper=list_tracked_errors_error_mapper,
            request_options=request_options,
        )

    def resolve_tracked_error(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OpsErrorsResolveResponse, ResolveTrackedErrorBody]:
        """Resolve an error group; it reopens and alerts if it recurs.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/ops/errors/{id}/resolve"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[OpsErrorsResolveResponse],
            error_mapper=resolve_tracked_error_mapper,
            request_options=request_options,
        )

    def send_test_alert(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AlertTestResponse, SendTestAlertErrorBody]:
        """Send a test alert to every configured channel.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/ops/alerts/test"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[AlertTestResponse],
            error_mapper=send_test_alert_error_mapper,
            request_options=request_options,
        )


class AsyncOperationsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def get_platform_health(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OpsHealthDto, GetPlatformHealthErrorBody]:
        """Platform health (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/ops/health"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[OpsHealthDto],
            error_mapper=get_platform_health_error_mapper,
            request_options=request_options,
        )

    async def list_tracked_errors(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OpsErrorsResponse, ListTrackedErrorsErrorBody]:
        """Tracked error groups (operators).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/ops/errors"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[OpsErrorsResponse],
            error_mapper=list_tracked_errors_error_mapper,
            request_options=request_options,
        )

    async def resolve_tracked_error(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OpsErrorsResolveResponse, ResolveTrackedErrorBody]:
        """Resolve an error group; it reopens and alerts if it recurs.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/ops/errors/{id}/resolve"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[OpsErrorsResolveResponse],
            error_mapper=resolve_tracked_error_mapper,
            request_options=request_options,
        )

    async def send_test_alert(
        self, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AlertTestResponse, SendTestAlertErrorBody]:
        """Send a test alert to every configured channel.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/ops/alerts/test"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[AlertTestResponse],
            error_mapper=send_test_alert_error_mapper,
            request_options=request_options,
        )
