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
from ..errors.get_pay_pal_notification_status_error import (
    GetPayPalNotificationStatusErrorBody,
    get_pay_pal_notification_status_error_mapper,
)
from ..errors.list_audit_events_error import ListAuditEventsErrorBody, list_audit_events_error_mapper
from ..errors.list_policy_decisions_error import ListPolicyDecisionsErrorBody, list_policy_decisions_error_mapper
from ..errors.list_security_findings_error import ListSecurityFindingsErrorBody, list_security_findings_error_mapper
from ..errors.verify_audit_chain_error import VerifyAuditChainErrorBody, verify_audit_chain_error_mapper
from ..models.audit_chain_verification_dto import AuditChainVerificationDto
from ..models.security_audit_response import SecurityAuditResponse
from ..models.security_decisions_response import SecurityDecisionsResponse
from ..models.security_events_response import SecurityEventsResponse
from ..models.security_paypal_notifications_response import SecurityPaypalNotificationsResponse
from ..server.server import Server


class SecurityApi:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = SecurityApiWithRawResponse(client, server, auth)

    def get_pay_pal_notification_status(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> SecurityPaypalNotificationsResponse:
        """Whether PayPal's signed notifications are arriving.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Whether PayPal's signed notifications are arriving

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_pay_pal_notification_status(request_options=request_options))

    def list_audit_events(self, *, request_options: RequestOptionsOrDict | None = None) -> SecurityAuditResponse:
        """Hash-chained audit log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Hash-chained audit log

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_audit_events(request_options=request_options))

    def list_policy_decisions(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> SecurityDecisionsResponse:
        """Policy decisions.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Policy decisions

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_policy_decisions(request_options=request_options))

    def list_security_findings(self, *, request_options: RequestOptionsOrDict | None = None) -> SecurityEventsResponse:
        """TrustRail findings and evidence.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            TrustRail findings and evidence

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_security_findings(request_options=request_options))

    def verify_audit_chain(self, *, request_options: RequestOptionsOrDict | None = None) -> AuditChainVerificationDto:
        """Verify the audit hash chain. Requires the MANAGER role.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verify the audit hash chain

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.verify_audit_chain(request_options=request_options))

    @property
    def with_raw_response(self) -> SecurityApiWithRawResponse:
        return self._with_raw_response


class AsyncSecurityApi:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncSecurityApiWithRawResponse(client, server, auth)

    async def get_pay_pal_notification_status(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> SecurityPaypalNotificationsResponse:
        """Whether PayPal's signed notifications are arriving.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Whether PayPal's signed notifications are arriving

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_pay_pal_notification_status(request_options=request_options))

    async def list_audit_events(self, *, request_options: RequestOptionsOrDict | None = None) -> SecurityAuditResponse:
        """Hash-chained audit log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Hash-chained audit log

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_audit_events(request_options=request_options))

    async def list_policy_decisions(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> SecurityDecisionsResponse:
        """Policy decisions.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Policy decisions

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_policy_decisions(request_options=request_options))

    async def list_security_findings(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> SecurityEventsResponse:
        """TrustRail findings and evidence.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            TrustRail findings and evidence

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_security_findings(request_options=request_options))

    async def verify_audit_chain(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> AuditChainVerificationDto:
        """Verify the audit hash chain. Requires the MANAGER role.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verify the audit hash chain

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.verify_audit_chain(request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncSecurityApiWithRawResponse:
        return self._with_raw_response


class SecurityApiWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def get_pay_pal_notification_status(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityPaypalNotificationsResponse, GetPayPalNotificationStatusErrorBody]:
        """Whether PayPal's signed notifications are arriving.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/paypal-notifications"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SecurityPaypalNotificationsResponse],
            error_mapper=get_pay_pal_notification_status_error_mapper,
            request_options=request_options,
        )

    def list_audit_events(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityAuditResponse, ListAuditEventsErrorBody]:
        """Hash-chained audit log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/audit"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SecurityAuditResponse],
            error_mapper=list_audit_events_error_mapper,
            request_options=request_options,
        )

    def list_policy_decisions(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityDecisionsResponse, ListPolicyDecisionsErrorBody]:
        """Policy decisions.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/decisions"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SecurityDecisionsResponse],
            error_mapper=list_policy_decisions_error_mapper,
            request_options=request_options,
        )

    def list_security_findings(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityEventsResponse, ListSecurityFindingsErrorBody]:
        """TrustRail findings and evidence.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/events"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SecurityEventsResponse],
            error_mapper=list_security_findings_error_mapper,
            request_options=request_options,
        )

    def verify_audit_chain(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AuditChainVerificationDto, VerifyAuditChainErrorBody]:
        """Verify the audit hash chain. Requires the MANAGER role.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/audit/verify"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[AuditChainVerificationDto],
            error_mapper=verify_audit_chain_error_mapper,
            request_options=request_options,
        )


class AsyncSecurityApiWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def get_pay_pal_notification_status(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityPaypalNotificationsResponse, GetPayPalNotificationStatusErrorBody]:
        """Whether PayPal's signed notifications are arriving.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/paypal-notifications"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SecurityPaypalNotificationsResponse],
            error_mapper=get_pay_pal_notification_status_error_mapper,
            request_options=request_options,
        )

    async def list_audit_events(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityAuditResponse, ListAuditEventsErrorBody]:
        """Hash-chained audit log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/audit"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SecurityAuditResponse],
            error_mapper=list_audit_events_error_mapper,
            request_options=request_options,
        )

    async def list_policy_decisions(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityDecisionsResponse, ListPolicyDecisionsErrorBody]:
        """Policy decisions.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/decisions"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SecurityDecisionsResponse],
            error_mapper=list_policy_decisions_error_mapper,
            request_options=request_options,
        )

    async def list_security_findings(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SecurityEventsResponse, ListSecurityFindingsErrorBody]:
        """TrustRail findings and evidence.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/events"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SecurityEventsResponse],
            error_mapper=list_security_findings_error_mapper,
            request_options=request_options,
        )

    async def verify_audit_chain(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AuditChainVerificationDto, VerifyAuditChainErrorBody]:
        """Verify the audit hash chain. Requires the MANAGER role.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/security/audit/verify"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[AuditChainVerificationDto],
            error_mapper=verify_audit_chain_error_mapper,
            request_options=request_options,
        )
