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
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.approve_procurement_request_error import (
    ApproveProcurementRequestErrorBody,
    approve_procurement_request_error_mapper,
)
from ..errors.create_procurement_request_error import (
    CreateProcurementRequestErrorBody,
    create_procurement_request_error_mapper,
)
from ..errors.evaluate_procurement_request_error import (
    EvaluateProcurementRequestErrorBody,
    evaluate_procurement_request_error_mapper,
)
from ..errors.get_procurement_request_error import GetProcurementRequestErrorBody, get_procurement_request_error_mapper
from ..errors.list_procurement_requests_error import (
    ListProcurementRequestsErrorBody,
    list_procurement_requests_error_mapper,
)
from ..errors.reject_procurement_request_error import (
    RejectProcurementRequestErrorBody,
    reject_procurement_request_error_mapper,
)
from ..errors.research_procurement_request_error import (
    ResearchProcurementRequestErrorBody,
    research_procurement_request_error_mapper,
)
from ..models.approve_request import ApproveRequest, ApproveRequestDict
from ..models.create_procurement_request import CreateProcurementRequest, CreateProcurementRequestDict
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.procurement_request_dto import ProcurementRequestDto
from ..models.procurement_requests_approve_response import ProcurementRequestsApproveResponse
from ..models.procurement_requests_response import ProcurementRequestsResponse
from ..models.reject_request import RejectRequest, RejectRequestDict
from ..server.server import Server


class Procurement:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = ProcurementWithRawResponse(client, server, auth)

    def approve_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ApproveRequest | ApproveRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProcurementRequestsApproveResponse:
        """Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role. Idempotent:
        send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: The owner's approval of one exact proposal, bound to the cart hash they saw.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Approve an exact cart, sign an Intent Certificate and reserve budget

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.approve_procurement_request(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def create_procurement_request(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CreateProcurementRequest | CreateProcurementRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProcurementRequestDto:
        """Submit a natural-language request. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A natural-language purchasing instruction for the agent.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Submit a natural-language request

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Refused by policy (for
                example ``CAPTURE_REFUSED``); see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.create_procurement_request(
                x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def evaluate_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestDto:
        """Re-run TrustRail on open proposals. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Re-run TrustRail on open proposals

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.evaluate_procurement_request(id_, x_requested_with, request_options=request_options)
        )

    def get_procurement_request(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestDto:
        """Request with forecast, market evidence, candidates, proposals and TrustRail decisions.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Request with forecast, market evidence, candidates, proposals and TrustRail decisions

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_procurement_request(id_, request_options=request_options))

    def list_procurement_requests(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestsResponse:
        """List procurement requests.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            List procurement requests

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_procurement_requests(request_options=request_options))

    def reject_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: RejectRequest | RejectRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProcurementRequestDto:
        """Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Reject one proposal, or every open proposal on the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Reject one proposal (purchase_order_id) or every open proposal

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.reject_procurement_request(
                id_, x_requested_with, body, request_options=request_options
            ),
        )

    def research_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestDto:
        """Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.research_procurement_request(id_, x_requested_with, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> ProcurementWithRawResponse:
        return self._with_raw_response


class AsyncProcurement:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncProcurementWithRawResponse(client, server, auth)

    async def approve_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ApproveRequest | ApproveRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProcurementRequestsApproveResponse:
        """Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role. Idempotent:
        send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: The owner's approval of one exact proposal, bound to the cart hash they saw.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Approve an exact cart, sign an Intent Certificate and reserve budget

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.approve_procurement_request(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def create_procurement_request(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CreateProcurementRequest | CreateProcurementRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProcurementRequestDto:
        """Submit a natural-language request. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A natural-language purchasing instruction for the agent.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Submit a natural-language request

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Refused by policy (for
                example ``CAPTURE_REFUSED``); see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.create_procurement_request(
                x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def evaluate_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestDto:
        """Re-run TrustRail on open proposals. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Re-run TrustRail on open proposals

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.evaluate_procurement_request(
                id_, x_requested_with, request_options=request_options
            ),
        )

    async def get_procurement_request(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestDto:
        """Request with forecast, market evidence, candidates, proposals and TrustRail decisions.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Request with forecast, market evidence, candidates, proposals and TrustRail decisions

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_procurement_request(id_, request_options=request_options))

    async def list_procurement_requests(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestsResponse:
        """List procurement requests.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            List procurement requests

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_procurement_requests(request_options=request_options))

    async def reject_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: RejectRequest | RejectRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProcurementRequestDto:
        """Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Reject one proposal, or every open proposal on the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Reject one proposal (purchase_order_id) or every open proposal

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.reject_procurement_request(
                id_, x_requested_with, body, request_options=request_options
            ),
        )

    async def research_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ProcurementRequestDto:
        """Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.research_procurement_request(
                id_, x_requested_with, request_options=request_options
            ),
        )

    @property
    def with_raw_response(self) -> AsyncProcurementWithRawResponse:
        return self._with_raw_response


class ProcurementWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def approve_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ApproveRequest | ApproveRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProcurementRequestsApproveResponse, ApproveProcurementRequestErrorBody]:
        """Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role. Idempotent:
        send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: The owner's approval of one exact proposal, bound to the cart hash they saw.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/approve"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[ApproveRequest | ApproveRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestsApproveResponse],
            error_mapper=approve_procurement_request_error_mapper,
            request_options=request_options,
        )

    def create_procurement_request(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CreateProcurementRequest | CreateProcurementRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProcurementRequestDto, CreateProcurementRequestErrorBody]:
        """Submit a natural-language request. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A natural-language purchasing instruction for the agent.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[CreateProcurementRequest | CreateProcurementRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestDto],
            error_mapper=create_procurement_request_error_mapper,
            request_options=request_options,
        )

    def evaluate_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestDto, EvaluateProcurementRequestErrorBody]:
        """Re-run TrustRail on open proposals. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/evaluate"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestDto],
            error_mapper=evaluate_procurement_request_error_mapper,
            request_options=request_options,
        )

    def get_procurement_request(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestDto, GetProcurementRequestErrorBody]:
        """Request with forecast, market evidence, candidates, proposals and TrustRail decisions.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/procurement/requests/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestDto],
            error_mapper=get_procurement_request_error_mapper,
            request_options=request_options,
        )

    def list_procurement_requests(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestsResponse, ListProcurementRequestsErrorBody]:
        """List procurement requests.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/procurement/requests"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestsResponse],
            error_mapper=list_procurement_requests_error_mapper,
            request_options=request_options,
        )

    def reject_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: RejectRequest | RejectRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProcurementRequestDto, RejectProcurementRequestErrorBody]:
        """Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Reject one proposal, or every open proposal on the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/reject"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[RejectRequest | RejectRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestDto],
            error_mapper=reject_procurement_request_error_mapper,
            request_options=request_options,
        )

    def research_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestDto, ResearchProcurementRequestErrorBody]:
        """Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/research"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ProcurementRequestDto],
            error_mapper=research_procurement_request_error_mapper,
            request_options=request_options,
        )


class AsyncProcurementWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def approve_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ApproveRequest | ApproveRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProcurementRequestsApproveResponse, ApproveProcurementRequestErrorBody]:
        """Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role. Idempotent:
        send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: The owner's approval of one exact proposal, bound to the cart hash they saw.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/approve"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[ApproveRequest | ApproveRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestsApproveResponse],
            error_mapper=approve_procurement_request_error_mapper,
            request_options=request_options,
        )

    async def create_procurement_request(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CreateProcurementRequest | CreateProcurementRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProcurementRequestDto, CreateProcurementRequestErrorBody]:
        """Submit a natural-language request. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A natural-language purchasing instruction for the agent.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[CreateProcurementRequest | CreateProcurementRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestDto],
            error_mapper=create_procurement_request_error_mapper,
            request_options=request_options,
        )

    async def evaluate_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestDto, EvaluateProcurementRequestErrorBody]:
        """Re-run TrustRail on open proposals. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/evaluate"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestDto],
            error_mapper=evaluate_procurement_request_error_mapper,
            request_options=request_options,
        )

    async def get_procurement_request(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestDto, GetProcurementRequestErrorBody]:
        """Request with forecast, market evidence, candidates, proposals and TrustRail decisions.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/procurement/requests/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestDto],
            error_mapper=get_procurement_request_error_mapper,
            request_options=request_options,
        )

    async def list_procurement_requests(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestsResponse, ListProcurementRequestsErrorBody]:
        """List procurement requests.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/procurement/requests"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestsResponse],
            error_mapper=list_procurement_requests_error_mapper,
            request_options=request_options,
        )

    async def reject_procurement_request(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: RejectRequest | RejectRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProcurementRequestDto, RejectProcurementRequestErrorBody]:
        """Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Reject one proposal, or every open proposal on the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/reject"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[RejectRequest | RejectRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestDto],
            error_mapper=reject_procurement_request_error_mapper,
            request_options=request_options,
        )

    async def research_procurement_request(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ProcurementRequestDto, ResearchProcurementRequestErrorBody]:
        """Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/procurement/requests/{id}/research"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ProcurementRequestDto],
            error_mapper=research_procurement_request_error_mapper,
            request_options=request_options,
        )
