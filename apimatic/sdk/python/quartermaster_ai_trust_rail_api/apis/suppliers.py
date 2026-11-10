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
from ..errors.create_catalog_item_error import CreateCatalogItemErrorBody, create_catalog_item_error_mapper
from ..errors.create_supplier_error import CreateSupplierErrorBody, create_supplier_error_mapper
from ..errors.get_supplier_error import GetSupplierErrorBody, get_supplier_error_mapper
from ..errors.list_suppliers_error import ListSuppliersErrorBody, list_suppliers_error_mapper
from ..errors.update_catalog_item_error import UpdateCatalogItemErrorBody, update_catalog_item_error_mapper
from ..errors.update_supplier_error import UpdateSupplierErrorBody, update_supplier_error_mapper
from ..models.catalog_item_input import CatalogItemInput, CatalogItemInputDict
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.supplier_input import SupplierInput, SupplierInputDict
from ..models.suppliers_catalog_response import SuppliersCatalogResponse
from ..models.suppliers_response import SuppliersResponse
from ..models.suppliers_response1 import SuppliersResponse1
from ..server.server import Server


class Suppliers:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = SuppliersWithRawResponse(client, server, auth)

    def create_catalog_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersCatalogResponse:
        """Add a catalog listing (screened for prompt injection). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Add a catalog listing (screened for prompt injection)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.create_catalog_item(id_, x_requested_with, body, request_options=request_options)
        )

    def create_supplier(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersResponse1:
        """Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Add a supplier (owners approve it in the Spend Mandate)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.create_supplier(x_requested_with, body, request_options=request_options))

    def get_supplier(self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse1:
        """Supplier with its catalog.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Supplier with its catalog

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_supplier(id_, request_options=request_options))

    def list_suppliers(self, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse:
        """Suppliers with mandate approval and catalog size.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Suppliers with mandate approval and catalog size

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_suppliers(request_options=request_options))

    def update_catalog_item(
        self,
        id_: UUID,
        item_id: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersCatalogResponse:
        """Update a catalog listing. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            item_id: itemId id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Update a catalog listing

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.update_catalog_item(
                id_, item_id, x_requested_with, body, request_options=request_options
            ),
        )

    def update_supplier(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersResponse1:
        """Update a supplier. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Update a supplier

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.update_supplier(id_, x_requested_with, body, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> SuppliersWithRawResponse:
        return self._with_raw_response


class AsyncSuppliers:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncSuppliersWithRawResponse(client, server, auth)

    async def create_catalog_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersCatalogResponse:
        """Add a catalog listing (screened for prompt injection). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Add a catalog listing (screened for prompt injection)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.create_catalog_item(
                id_, x_requested_with, body, request_options=request_options
            ),
        )

    async def create_supplier(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersResponse1:
        """Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Add a supplier (owners approve it in the Spend Mandate)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.create_supplier(x_requested_with, body, request_options=request_options)
        )

    async def get_supplier(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> SuppliersResponse1:
        """Supplier with its catalog.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Supplier with its catalog

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_supplier(id_, request_options=request_options))

    async def list_suppliers(self, *, request_options: RequestOptionsOrDict | None = None) -> SuppliersResponse:
        """Suppliers with mandate approval and catalog size.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Suppliers with mandate approval and catalog size

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_suppliers(request_options=request_options))

    async def update_catalog_item(
        self,
        id_: UUID,
        item_id: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersCatalogResponse:
        """Update a catalog listing. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            item_id: itemId id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Update a catalog listing

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.update_catalog_item(
                id_, item_id, x_requested_with, body, request_options=request_options
            ),
        )

    async def update_supplier(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> SuppliersResponse1:
        """Update a supplier. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Update a supplier

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.update_supplier(id_, x_requested_with, body, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> AsyncSuppliersWithRawResponse:
        return self._with_raw_response


class SuppliersWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def create_catalog_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersCatalogResponse, CreateCatalogItemErrorBody]:
        """Add a catalog listing (screened for prompt injection). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/suppliers/{id}/catalog"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CatalogItemInput | CatalogItemInputDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SuppliersCatalogResponse],
            error_mapper=create_catalog_item_error_mapper,
            request_options=request_options,
        )

    def create_supplier(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersResponse1, CreateSupplierErrorBody]:
        """Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/suppliers"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[SupplierInput | SupplierInputDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SuppliersResponse1],
            error_mapper=create_supplier_error_mapper,
            request_options=request_options,
        )

    def get_supplier(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SuppliersResponse1, GetSupplierErrorBody]:
        """Supplier with its catalog.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/suppliers/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SuppliersResponse1],
            error_mapper=get_supplier_error_mapper,
            request_options=request_options,
        )

    def list_suppliers(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SuppliersResponse, ListSuppliersErrorBody]:
        """Suppliers with mandate approval and catalog size.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/suppliers"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SuppliersResponse],
            error_mapper=list_suppliers_error_mapper,
            request_options=request_options,
        )

    def update_catalog_item(
        self,
        id_: UUID,
        item_id: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersCatalogResponse, UpdateCatalogItemErrorBody]:
        """Update a catalog listing. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            item_id: itemId id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/suppliers/{id}/catalog/{itemId}"),
            path_params=[param[UUID]("id", id_), param[UUID]("itemId", item_id)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CatalogItemInput | CatalogItemInputDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SuppliersCatalogResponse],
            error_mapper=update_catalog_item_error_mapper,
            request_options=request_options,
        )

    def update_supplier(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersResponse1, UpdateSupplierErrorBody]:
        """Update a supplier. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/suppliers/{id}"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[SupplierInput | SupplierInputDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[SuppliersResponse1],
            error_mapper=update_supplier_error_mapper,
            request_options=request_options,
        )


class AsyncSuppliersWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def create_catalog_item(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersCatalogResponse, CreateCatalogItemErrorBody]:
        """Add a catalog listing (screened for prompt injection). Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/suppliers/{id}/catalog"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CatalogItemInput | CatalogItemInputDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SuppliersCatalogResponse],
            error_mapper=create_catalog_item_error_mapper,
            request_options=request_options,
        )

    async def create_supplier(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersResponse1, CreateSupplierErrorBody]:
        """Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/suppliers"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[SupplierInput | SupplierInputDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SuppliersResponse1],
            error_mapper=create_supplier_error_mapper,
            request_options=request_options,
        )

    async def get_supplier(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SuppliersResponse1, GetSupplierErrorBody]:
        """Supplier with its catalog.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/suppliers/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SuppliersResponse1],
            error_mapper=get_supplier_error_mapper,
            request_options=request_options,
        )

    async def list_suppliers(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[SuppliersResponse, ListSuppliersErrorBody]:
        """Suppliers with mandate approval and catalog size.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/suppliers"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SuppliersResponse],
            error_mapper=list_suppliers_error_mapper,
            request_options=request_options,
        )

    async def update_catalog_item(
        self,
        id_: UUID,
        item_id: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: CatalogItemInput | CatalogItemInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersCatalogResponse, UpdateCatalogItemErrorBody]:
        """Update a catalog listing. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            item_id: itemId id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a catalog listing.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/suppliers/{id}/catalog/{itemId}"),
            path_params=[param[UUID]("id", id_), param[UUID]("itemId", item_id)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CatalogItemInput | CatalogItemInputDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SuppliersCatalogResponse],
            error_mapper=update_catalog_item_error_mapper,
            request_options=request_options,
        )

    async def update_supplier(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: SupplierInput | SupplierInputDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[SuppliersResponse1, UpdateSupplierErrorBody]:
        """Update a supplier. Requires the MANAGER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Fields for creating or updating a supplier.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/suppliers/{id}"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[SupplierInput | SupplierInputDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[SuppliersResponse1],
            error_mapper=update_supplier_error_mapper,
            request_options=request_options,
        )
