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
from ..errors.analyze_invoice_error import AnalyzeInvoiceErrorBody, analyze_invoice_error_mapper
from ..errors.delay_delivery_error import DelayDeliveryErrorBody, delay_delivery_error_mapper
from ..errors.get_purchase_order_error import GetPurchaseOrderErrorBody, get_purchase_order_error_mapper
from ..errors.list_deliveries_error import ListDeliveriesErrorBody, list_deliveries_error_mapper
from ..errors.list_invoices_error import ListInvoicesErrorBody, list_invoices_error_mapper
from ..errors.list_purchase_orders_error import ListPurchaseOrdersErrorBody, list_purchase_orders_error_mapper
from ..errors.receive_delivery_error import ReceiveDeliveryErrorBody, receive_delivery_error_mapper
from ..models.analyze_invoice_request import AnalyzeInvoiceRequest, AnalyzeInvoiceRequestDict
from ..models.delay_delivery_request import DelayDeliveryRequest, DelayDeliveryRequestDict
from ..models.deliveries_delay_response import DeliveriesDelayResponse
from ..models.deliveries_receive_response import DeliveriesReceiveResponse
from ..models.deliveries_response import DeliveriesResponse
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.invoice_dto import InvoiceDto
from ..models.invoices_response import InvoicesResponse
from ..models.purchase_order_dto import PurchaseOrderDto
from ..models.purchase_orders_response import PurchaseOrdersResponse
from ..models.receive_delivery_request import ReceiveDeliveryRequest, ReceiveDeliveryRequestDict
from ..server.server import Server


class Orders:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = OrdersWithRawResponse(client, server, auth)

    def analyze_invoice(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvoiceDto:
        """Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A supplier invoice to match against its purchase order and delivery.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Three-way match and duplicate detection

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Refused by policy (for
                example ``CAPTURE_REFUSED``); see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.analyze_invoice(
                x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def delay_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: DelayDeliveryRequest | DelayDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> DeliveriesDelayResponse:
        """Record a supplier delay. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Move a delivery's expected date, with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Record a supplier delay

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.delay_delivery(id_, x_requested_with, body, request_options=request_options)
        )

    def get_purchase_order(self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> PurchaseOrderDto:
        """One purchase order.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            One purchase order

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_purchase_order(id_, request_options=request_options))

    def list_deliveries(self, *, request_options: RequestOptionsOrDict | None = None) -> DeliveriesResponse:
        """Synthetic deliveries.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Synthetic deliveries

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_deliveries(request_options=request_options))

    def list_invoices(self, *, request_options: RequestOptionsOrDict | None = None) -> InvoicesResponse:
        """Recorded invoices.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Recorded invoices

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_invoices(request_options=request_options))

    def list_purchase_orders(self, *, request_options: RequestOptionsOrDict | None = None) -> PurchaseOrdersResponse:
        """Purchase order history, optionally filtered by status.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Purchase order history, optionally filtered by status

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_purchase_orders(request_options=request_options))

    def receive_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ReceiveDeliveryRequest | ReceiveDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> DeliveriesReceiveResponse:
        """Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Quantities received per purchase order line.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Confirm goods receipt (updates inventory)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.receive_delivery(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    @property
    def with_raw_response(self) -> OrdersWithRawResponse:
        return self._with_raw_response


class AsyncOrders:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncOrdersWithRawResponse(client, server, auth)

    async def analyze_invoice(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvoiceDto:
        """Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A supplier invoice to match against its purchase order and delivery.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Three-way match and duplicate detection

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Refused by policy (for
                example ``CAPTURE_REFUSED``); see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.analyze_invoice(
                x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def delay_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: DelayDeliveryRequest | DelayDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> DeliveriesDelayResponse:
        """Record a supplier delay. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Move a delivery's expected date, with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Record a supplier delay

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.delay_delivery(id_, x_requested_with, body, request_options=request_options)
        )

    async def get_purchase_order(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> PurchaseOrderDto:
        """One purchase order.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            One purchase order

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_purchase_order(id_, request_options=request_options))

    async def list_deliveries(self, *, request_options: RequestOptionsOrDict | None = None) -> DeliveriesResponse:
        """Synthetic deliveries.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Synthetic deliveries

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_deliveries(request_options=request_options))

    async def list_invoices(self, *, request_options: RequestOptionsOrDict | None = None) -> InvoicesResponse:
        """Recorded invoices.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Recorded invoices

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_invoices(request_options=request_options))

    async def list_purchase_orders(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> PurchaseOrdersResponse:
        """Purchase order history, optionally filtered by status.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Purchase order history, optionally filtered by status

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_purchase_orders(request_options=request_options))

    async def receive_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ReceiveDeliveryRequest | ReceiveDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> DeliveriesReceiveResponse:
        """Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Quantities received per purchase order line.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Confirm goods receipt (updates inventory)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.receive_delivery(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    @property
    def with_raw_response(self) -> AsyncOrdersWithRawResponse:
        return self._with_raw_response


class OrdersWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def analyze_invoice(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvoiceDto, AnalyzeInvoiceErrorBody]:
        """Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A supplier invoice to match against its purchase order and delivery.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/invoices/analyze"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InvoiceDto],
            error_mapper=analyze_invoice_error_mapper,
            request_options=request_options,
        )

    def delay_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: DelayDeliveryRequest | DelayDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[DeliveriesDelayResponse, DelayDeliveryErrorBody]:
        """Record a supplier delay. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Move a delivery's expected date, with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/deliveries/{id}/delay"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[DelayDeliveryRequest | DelayDeliveryRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[DeliveriesDelayResponse],
            error_mapper=delay_delivery_error_mapper,
            request_options=request_options,
        )

    def get_purchase_order(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PurchaseOrderDto, GetPurchaseOrderErrorBody]:
        """One purchase order.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/purchase-orders/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PurchaseOrderDto],
            error_mapper=get_purchase_order_error_mapper,
            request_options=request_options,
        )

    def list_deliveries(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[DeliveriesResponse, ListDeliveriesErrorBody]:
        """Synthetic deliveries.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/deliveries"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[DeliveriesResponse],
            error_mapper=list_deliveries_error_mapper,
            request_options=request_options,
        )

    def list_invoices(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[InvoicesResponse, ListInvoicesErrorBody]:
        """Recorded invoices.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/invoices"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InvoicesResponse],
            error_mapper=list_invoices_error_mapper,
            request_options=request_options,
        )

    def list_purchase_orders(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PurchaseOrdersResponse, ListPurchaseOrdersErrorBody]:
        """Purchase order history, optionally filtered by status.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/purchase-orders"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PurchaseOrdersResponse],
            error_mapper=list_purchase_orders_error_mapper,
            request_options=request_options,
        )

    def receive_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ReceiveDeliveryRequest | ReceiveDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[DeliveriesReceiveResponse, ReceiveDeliveryErrorBody]:
        """Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Quantities received per purchase order line.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/deliveries/{id}/receive"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[ReceiveDeliveryRequest | ReceiveDeliveryRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[DeliveriesReceiveResponse],
            error_mapper=receive_delivery_error_mapper,
            request_options=request_options,
        )


class AsyncOrdersWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def analyze_invoice(
        self,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvoiceDto, AnalyzeInvoiceErrorBody]:
        """Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: A supplier invoice to match against its purchase order and delivery.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/invoices/analyze"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[AnalyzeInvoiceRequest | AnalyzeInvoiceRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InvoiceDto],
            error_mapper=analyze_invoice_error_mapper,
            request_options=request_options,
        )

    async def delay_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: DelayDeliveryRequest | DelayDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[DeliveriesDelayResponse, DelayDeliveryErrorBody]:
        """Record a supplier delay. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Move a delivery's expected date, with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/deliveries/{id}/delay"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[DelayDeliveryRequest | DelayDeliveryRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[DeliveriesDelayResponse],
            error_mapper=delay_delivery_error_mapper,
            request_options=request_options,
        )

    async def get_purchase_order(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PurchaseOrderDto, GetPurchaseOrderErrorBody]:
        """One purchase order.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/purchase-orders/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PurchaseOrderDto],
            error_mapper=get_purchase_order_error_mapper,
            request_options=request_options,
        )

    async def list_deliveries(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[DeliveriesResponse, ListDeliveriesErrorBody]:
        """Synthetic deliveries.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/deliveries"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[DeliveriesResponse],
            error_mapper=list_deliveries_error_mapper,
            request_options=request_options,
        )

    async def list_invoices(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[InvoicesResponse, ListInvoicesErrorBody]:
        """Recorded invoices.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/invoices"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InvoicesResponse],
            error_mapper=list_invoices_error_mapper,
            request_options=request_options,
        )

    async def list_purchase_orders(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PurchaseOrdersResponse, ListPurchaseOrdersErrorBody]:
        """Purchase order history, optionally filtered by status.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/purchase-orders"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PurchaseOrdersResponse],
            error_mapper=list_purchase_orders_error_mapper,
            request_options=request_options,
        )

    async def receive_delivery(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: ReceiveDeliveryRequest | ReceiveDeliveryRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[DeliveriesReceiveResponse, ReceiveDeliveryErrorBody]:
        """Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Quantities received per purchase order line.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/deliveries/{id}/receive"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[ReceiveDeliveryRequest | ReceiveDeliveryRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[DeliveriesReceiveResponse],
            error_mapper=receive_delivery_error_mapper,
            request_options=request_options,
        )
