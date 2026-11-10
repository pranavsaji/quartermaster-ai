from __future__ import annotations

from uuid import UUID

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
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.get_spend_mandate_error import GetSpendMandateErrorBody, get_spend_mandate_error_mapper
from ..errors.update_spend_mandate_error import UpdateSpendMandateErrorBody, update_spend_mandate_error_mapper
from ..errors.verify_intent_certificate_error import (
    VerifyIntentCertificateErrorBody,
    verify_intent_certificate_error_mapper,
)
from ..models.certificate_verification_dto import CertificateVerificationDto
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.mandate_update_response import MandateUpdateResponse
from ..models.mandates_current_response import MandatesCurrentResponse
from ..models.spend_mandate_input import SpendMandateInput, SpendMandateInputDict
from ..server.server import Server


class TrustRail:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = TrustRailWithRawResponse(client, server, auth)

    def get_spend_mandate(self, *, request_options: RequestOptionsOrDict | None = None) -> MandatesCurrentResponse:
        """Active Spend Mandate and weekly budget.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Active Spend Mandate and weekly budget

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_spend_mandate(request_options=request_options))

    def update_spend_mandate(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: SpendMandateInput | SpendMandateInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> MandateUpdateResponse:
        """Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A new Spend Mandate version (optimistic concurrency on ``expected_version``).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Publish a new mandate version (revokes approvals if tightened)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Refused by policy (for
                example ``CAPTURE_REFUSED``); see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.update_spend_mandate(
                x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def verify_intent_certificate(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> CertificateVerificationDto:
        """Verify an Intent Certificate against the live cart.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verify an Intent Certificate against the live cart

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.verify_intent_certificate(id_, request_options=request_options))

    @property
    def with_raw_response(self) -> TrustRailWithRawResponse:
        return self._with_raw_response


class AsyncTrustRail:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncTrustRailWithRawResponse(client, server, auth)

    async def get_spend_mandate(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> MandatesCurrentResponse:
        """Active Spend Mandate and weekly budget.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Active Spend Mandate and weekly budget

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_spend_mandate(request_options=request_options))

    async def update_spend_mandate(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: SpendMandateInput | SpendMandateInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> MandateUpdateResponse:
        """Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A new Spend Mandate version (optimistic concurrency on ``expected_version``).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Publish a new mandate version (revokes approvals if tightened)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Refused by policy (for
                example ``CAPTURE_REFUSED``); see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.update_spend_mandate(
                x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def verify_intent_certificate(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> CertificateVerificationDto:
        """Verify an Intent Certificate against the live cart.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verify an Intent Certificate against the live cart

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.verify_intent_certificate(id_, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncTrustRailWithRawResponse:
        return self._with_raw_response


class TrustRailWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def get_spend_mandate(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[MandatesCurrentResponse, GetSpendMandateErrorBody]:
        """Active Spend Mandate and weekly budget.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/mandates/current"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[MandatesCurrentResponse],
            error_mapper=get_spend_mandate_error_mapper,
            request_options=request_options,
        )

    def update_spend_mandate(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: SpendMandateInput | SpendMandateInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[MandateUpdateResponse, UpdateSpendMandateErrorBody]:
        """Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A new Spend Mandate version (optimistic concurrency on ``expected_version``).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/mandates/current"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[SpendMandateInput | SpendMandateInputDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[MandateUpdateResponse],
            error_mapper=update_spend_mandate_error_mapper,
            request_options=request_options,
        )

    def verify_intent_certificate(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[CertificateVerificationDto, VerifyIntentCertificateErrorBody]:
        """Verify an Intent Certificate against the live cart.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/intents/{id}/verify"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[CertificateVerificationDto],
            error_mapper=verify_intent_certificate_error_mapper,
            request_options=request_options,
        )


class AsyncTrustRailWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def get_spend_mandate(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[MandatesCurrentResponse, GetSpendMandateErrorBody]:
        """Active Spend Mandate and weekly budget.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/mandates/current"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[MandatesCurrentResponse],
            error_mapper=get_spend_mandate_error_mapper,
            request_options=request_options,
        )

    async def update_spend_mandate(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: SpendMandateInput | SpendMandateInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[MandateUpdateResponse, UpdateSpendMandateErrorBody]:
        """Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A new Spend Mandate version (optimistic concurrency on ``expected_version``).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/mandates/current"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[SpendMandateInput | SpendMandateInputDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[MandateUpdateResponse],
            error_mapper=update_spend_mandate_error_mapper,
            request_options=request_options,
        )

    async def verify_intent_certificate(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[CertificateVerificationDto, VerifyIntentCertificateErrorBody]:
        """Verify an Intent Certificate against the live cart.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/intents/{id}/verify"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[CertificateVerificationDto],
            error_mapper=verify_intent_certificate_error_mapper,
            request_options=request_options,
        )
