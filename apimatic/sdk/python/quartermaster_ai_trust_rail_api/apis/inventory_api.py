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
from ..errors.adjust_inventory_item_error import AdjustInventoryItemErrorBody, adjust_inventory_item_error_mapper
from ..errors.create_inventory_item_error import CreateInventoryItemErrorBody, create_inventory_item_error_mapper
from ..errors.forecast_inventory_error import ForecastInventoryErrorBody, forecast_inventory_error_mapper
from ..errors.list_inventory_error import ListInventoryErrorBody, list_inventory_error_mapper
from ..errors.update_inventory_item_error import UpdateInventoryItemErrorBody, update_inventory_item_error_mapper
from ..models.create_inventory_item_request import CreateInventoryItemRequest, CreateInventoryItemRequestDict
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.forecast_request import ForecastRequest, ForecastRequestDict
from ..models.forecast_run_dto import ForecastRunDto
from ..models.inventory_adjustment_request import InventoryAdjustmentRequest, InventoryAdjustmentRequestDict
from ..models.inventory_adjustments_response import InventoryAdjustmentsResponse
from ..models.inventory_item_input import InventoryItemInput, InventoryItemInputDict
from ..models.inventory_response import InventoryResponse
from ..models.inventory_response1 import InventoryResponse1
from ..server.server import Server


class InventoryApi:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = InventoryApiWithRawResponse(client, server, auth)

    def adjust_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: InventoryAdjustmentRequest | InventoryAdjustmentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InventoryAdjustmentsResponse:
        """Record an authorized stock change. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: An authorised stock change with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Record an authorized stock change

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.adjust_inventory_item(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def create_inventory_item(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInventoryItemRequest | CreateInventoryItemRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InventoryResponse1:
        """Add a stock item. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A new stock item, including its opening on-hand count.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Add a stock item

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.create_inventory_item(x_requested_with, body, request_options=request_options)
        )

    def forecast_inventory(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForecastRequest | ForecastRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ForecastRunDto:
        """Calculate reorder recommendations. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Parameters for a reorder forecast.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Calculate reorder recommendations

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.forecast_inventory(x_requested_with, body, request_options=request_options)
        )

    def list_inventory(self, *, request_options: RequestOptionsOrDict | None = None) -> InventoryResponse:
        """Current stock, usage and alerts.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Current stock, usage and alerts

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_inventory(request_options=request_options))

    def update_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: InventoryItemInput | InventoryItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InventoryResponse1:
        """Update a stock item's details (not its quantity). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Editable details of a stock item (quantities change through adjustments).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Update a stock item's details (not its quantity)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.update_inventory_item(id_, x_requested_with, body, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> InventoryApiWithRawResponse:
        return self._with_raw_response


class AsyncInventoryApi:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncInventoryApiWithRawResponse(client, server, auth)

    async def adjust_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: InventoryAdjustmentRequest | InventoryAdjustmentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InventoryAdjustmentsResponse:
        """Record an authorized stock change. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: An authorised stock change with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Record an authorized stock change

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.adjust_inventory_item(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def create_inventory_item(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInventoryItemRequest | CreateInventoryItemRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InventoryResponse1:
        """Add a stock item. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A new stock item, including its opening on-hand count.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Add a stock item

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.create_inventory_item(x_requested_with, body, request_options=request_options)
        )

    async def forecast_inventory(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForecastRequest | ForecastRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ForecastRunDto:
        """Calculate reorder recommendations. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Parameters for a reorder forecast.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Calculate reorder recommendations

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.forecast_inventory(x_requested_with, body, request_options=request_options)
        )

    async def list_inventory(self, *, request_options: RequestOptionsOrDict | None = None) -> InventoryResponse:
        """Current stock, usage and alerts.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Current stock, usage and alerts

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_inventory(request_options=request_options))

    async def update_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: InventoryItemInput | InventoryItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InventoryResponse1:
        """Update a stock item's details (not its quantity). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Editable details of a stock item (quantities change through adjustments).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Update a stock item's details (not its quantity)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.update_inventory_item(
                id_, x_requested_with, body, request_options=request_options
            ),
        )

    @property
    def with_raw_response(self) -> AsyncInventoryApiWithRawResponse:
        return self._with_raw_response


class InventoryApiWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def adjust_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: InventoryAdjustmentRequest | InventoryAdjustmentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InventoryAdjustmentsResponse, AdjustInventoryItemErrorBody]:
        """Record an authorized stock change. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: An authorised stock change with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/inventory/{id}/adjustments"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[InventoryAdjustmentRequest | InventoryAdjustmentRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InventoryAdjustmentsResponse],
            error_mapper=adjust_inventory_item_error_mapper,
            request_options=request_options,
        )

    def create_inventory_item(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInventoryItemRequest | CreateInventoryItemRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InventoryResponse1, CreateInventoryItemErrorBody]:
        """Add a stock item. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A new stock item, including its opening on-hand count.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/inventory"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CreateInventoryItemRequest | CreateInventoryItemRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InventoryResponse1],
            error_mapper=create_inventory_item_error_mapper,
            request_options=request_options,
        )

    def forecast_inventory(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForecastRequest | ForecastRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ForecastRunDto, ForecastInventoryErrorBody]:
        """Calculate reorder recommendations. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Parameters for a reorder forecast.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/inventory/forecast"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ForecastRequest | ForecastRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ForecastRunDto],
            error_mapper=forecast_inventory_error_mapper,
            request_options=request_options,
        )

    def list_inventory(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[InventoryResponse, ListInventoryErrorBody]:
        """Current stock, usage and alerts.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/inventory"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InventoryResponse],
            error_mapper=list_inventory_error_mapper,
            request_options=request_options,
        )

    def update_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: InventoryItemInput | InventoryItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InventoryResponse1, UpdateInventoryItemErrorBody]:
        """Update a stock item's details (not its quantity). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Editable details of a stock item (quantities change through adjustments).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/inventory/{id}"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[InventoryItemInput | InventoryItemInputDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InventoryResponse1],
            error_mapper=update_inventory_item_error_mapper,
            request_options=request_options,
        )


class AsyncInventoryApiWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def adjust_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: InventoryAdjustmentRequest | InventoryAdjustmentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InventoryAdjustmentsResponse, AdjustInventoryItemErrorBody]:
        """Record an authorized stock change. Requires the MANAGER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: An authorised stock change with a reason.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/inventory/{id}/adjustments"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[InventoryAdjustmentRequest | InventoryAdjustmentRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InventoryAdjustmentsResponse],
            error_mapper=adjust_inventory_item_error_mapper,
            request_options=request_options,
        )

    async def create_inventory_item(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInventoryItemRequest | CreateInventoryItemRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InventoryResponse1, CreateInventoryItemErrorBody]:
        """Add a stock item. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A new stock item, including its opening on-hand count.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/inventory"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CreateInventoryItemRequest | CreateInventoryItemRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InventoryResponse1],
            error_mapper=create_inventory_item_error_mapper,
            request_options=request_options,
        )

    async def forecast_inventory(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: ForecastRequest | ForecastRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ForecastRunDto, ForecastInventoryErrorBody]:
        """Calculate reorder recommendations. Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Parameters for a reorder forecast.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/inventory/forecast"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[ForecastRequest | ForecastRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ForecastRunDto],
            error_mapper=forecast_inventory_error_mapper,
            request_options=request_options,
        )

    async def list_inventory(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[InventoryResponse, ListInventoryErrorBody]:
        """Current stock, usage and alerts.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/inventory"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InventoryResponse],
            error_mapper=list_inventory_error_mapper,
            request_options=request_options,
        )

    async def update_inventory_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: InventoryItemInput | InventoryItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InventoryResponse1, UpdateInventoryItemErrorBody]:
        """Update a stock item's details (not its quantity). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Editable details of a stock item (quantities change through adjustments).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/inventory/{id}"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[InventoryItemInput | InventoryItemInputDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InventoryResponse1],
            error_mapper=update_inventory_item_error_mapper,
            request_options=request_options,
        )
