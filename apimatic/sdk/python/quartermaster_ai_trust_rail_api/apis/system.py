from __future__ import annotations

from uuid import UUID, uuid4

from ..core import (
    ApiResult,
    AsyncRawClient,
    BaseRawResponse,
    RawClient,
    RequestOptionsOrDict,
    async_json_decoder,
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.get_public_config_error import GetPublicConfigErrorBody, get_public_config_error_mapper
from ..errors.report_client_error import ReportClientErrorBody, report_client_error_mapper
from ..models.client_error_report import ClientErrorReport, ClientErrorReportDict
from ..models.client_errors_response import ClientErrorsResponse
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.public_config import PublicConfig
from ..server.server import Server


class System:
    def __init__(self, client: RawClient, server: Server) -> None:
        self._with_raw_response = SystemWithRawResponse(client, server)

    def get_public_config(self, *, request_options: RequestOptionsOrDict | None = None) -> PublicConfig:
        """Feature flags and PayPal client id.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Feature flags and PayPal client id

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_public_config(request_options=request_options))

    def report_client_error(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ClientErrorReport | ClientErrorReportDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ClientErrorsResponse:
        """Report a browser error to error tracking.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A browser error reported for error tracking.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Report a browser error to error tracking

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            self._with_raw_response.report_client_error(x_requested_with, body, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> SystemWithRawResponse:
        return self._with_raw_response


class AsyncSystem:
    def __init__(self, client: AsyncRawClient, server: Server) -> None:
        self._with_raw_response = AsyncSystemWithRawResponse(client, server)

    async def get_public_config(self, *, request_options: RequestOptionsOrDict | None = None) -> PublicConfig:
        """Feature flags and PayPal client id.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Feature flags and PayPal client id

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_public_config(request_options=request_options))

    async def report_client_error(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ClientErrorReport | ClientErrorReportDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ClientErrorsResponse:
        """Report a browser error to error tracking.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A browser error reported for error tracking.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Report a browser error to error tracking

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            await self._with_raw_response.report_client_error(x_requested_with, body, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> AsyncSystemWithRawResponse:
        return self._with_raw_response


class SystemWithRawResponse(BaseRawResponse[RawClient, Server]):
    def get_public_config(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PublicConfig, GetPublicConfigErrorBody]:
        """Feature flags and PayPal client id.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/config/public"),
            decoder=json_decoder[PublicConfig],
            error_mapper=get_public_config_error_mapper,
            request_options=request_options,
        )

    def report_client_error(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ClientErrorReport | ClientErrorReportDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ClientErrorsResponse, ReportClientErrorBody]:
        """Report a browser error to error tracking.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A browser error reported for error tracking.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/client-errors"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ClientErrorReport | ClientErrorReportDict](body),
            decoder=json_decoder[ClientErrorsResponse],
            error_mapper=report_client_error_mapper,
            request_options=request_options,
        )


class AsyncSystemWithRawResponse(BaseRawResponse[AsyncRawClient, Server]):
    async def get_public_config(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PublicConfig, GetPublicConfigErrorBody]:
        """Feature flags and PayPal client id.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/config/public"),
            decoder=async_json_decoder[PublicConfig],
            error_mapper=get_public_config_error_mapper,
            request_options=request_options,
        )

    async def report_client_error(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ClientErrorReport | ClientErrorReportDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ClientErrorsResponse, ReportClientErrorBody]:
        """Report a browser error to error tracking.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A browser error reported for error tracking.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/client-errors"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ClientErrorReport | ClientErrorReportDict](body),
            decoder=async_json_decoder[ClientErrorsResponse],
            error_mapper=report_client_error_mapper,
            request_options=request_options,
        )
