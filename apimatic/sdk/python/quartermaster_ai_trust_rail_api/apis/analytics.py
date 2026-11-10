from __future__ import annotations

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
    unwrap,
)
from ..errors.get_analytics_summary_error import GetAnalyticsSummaryErrorBody, get_analytics_summary_error_mapper
from ..models.analytics_summary_dto import AnalyticsSummaryDto
from ..server.server import Server


class Analytics:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = AnalyticsWithRawResponse(client, server, auth)

    def get_analytics_summary(self, *, request_options: RequestOptionsOrDict | None = None) -> AnalyticsSummaryDto:
        """Business and security outcomes.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Business and security outcomes

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_analytics_summary(request_options=request_options))

    @property
    def with_raw_response(self) -> AnalyticsWithRawResponse:
        return self._with_raw_response


class AsyncAnalytics:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncAnalyticsWithRawResponse(client, server, auth)

    async def get_analytics_summary(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> AnalyticsSummaryDto:
        """Business and security outcomes.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Business and security outcomes

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_analytics_summary(request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncAnalyticsWithRawResponse:
        return self._with_raw_response


class AnalyticsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def get_analytics_summary(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AnalyticsSummaryDto, GetAnalyticsSummaryErrorBody]:
        """Business and security outcomes.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/analytics/summary"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[AnalyticsSummaryDto],
            error_mapper=get_analytics_summary_error_mapper,
            request_options=request_options,
        )


class AsyncAnalyticsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def get_analytics_summary(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AnalyticsSummaryDto, GetAnalyticsSummaryErrorBody]:
        """Business and security outcomes.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/analytics/summary"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[AnalyticsSummaryDto],
            error_mapper=get_analytics_summary_error_mapper,
            request_options=request_options,
        )
