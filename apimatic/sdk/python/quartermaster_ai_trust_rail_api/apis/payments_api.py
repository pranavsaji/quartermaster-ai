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
from ..errors.capture_payment_error import CapturePaymentErrorBody, capture_payment_error_mapper
from ..errors.create_pay_pal_order_error import CreatePayPalOrderErrorBody, create_pay_pal_order_error_mapper
from ..errors.get_payment_error import GetPaymentErrorBody, get_payment_error_mapper
from ..errors.receive_pay_pal_webhook_error import ReceivePayPalWebhookErrorBody, receive_pay_pal_webhook_error_mapper
from ..errors.refund_payment_error import RefundPaymentErrorBody, refund_payment_error_mapper
from ..errors.sync_payment_error import SyncPaymentErrorBody, sync_payment_error_mapper
from ..models.capture_payment_request import CapturePaymentRequest, CapturePaymentRequestDict
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.pay_pal_order_response import PayPalOrderResponse
from ..models.payment_dto import PaymentDto
from ..models.payments_capture_response import PaymentsCaptureResponse
from ..models.payments_refund_response import PaymentsRefundResponse
from ..models.refund_request import RefundRequest, RefundRequestDict
from ..models.webhook_ack_response import WebhookAckResponse
from ..server.server import Server


class PaymentsApi:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = PaymentsApiWithRawResponse(client, server, auth)

    def capture_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CapturePaymentRequest | CapturePaymentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> PaymentsCaptureResponse:
        """Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Capture a PayPal order the buyer approved.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Guarded capture of an approved PayPal order

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.capture_payment(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def create_pay_pal_order(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> PayPalOrderResponse:
        """Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Create (or return) the PayPal sandbox order for an intent

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.create_pay_pal_order(
                id_, x_requested_with, idempotency_key, request_options=request_options
            ),
        )

    def get_payment(self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> PaymentDto:
        """Verified payment state.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verified payment state

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.get_payment(id_, request_options=request_options))

    def receive_pay_pal_webhook(self, *, request_options: RequestOptionsOrDict | None = None) -> WebhookAckResponse:
        """PayPal webhook receiver (signature-verified).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            PayPal webhook receiver (signature-verified)

        Raises:
            ApiError: The request conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error``
                is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.receive_pay_pal_webhook(request_options=request_options))

    def refund_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: RefundRequest | RefundRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> PaymentsRefundResponse:
        """Owner-authorized refund. Requires the OWNER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Refund part or all of a captured payment.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Owner-authorized refund

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.refund_payment(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    def sync_payment(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> PaymentDto:
        """Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Re-read the PayPal order and apply its state (never captures)

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.sync_payment(id_, x_requested_with, request_options=request_options))

    @property
    def with_raw_response(self) -> PaymentsApiWithRawResponse:
        return self._with_raw_response


class AsyncPaymentsApi:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncPaymentsApiWithRawResponse(client, server, auth)

    async def capture_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CapturePaymentRequest | CapturePaymentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> PaymentsCaptureResponse:
        """Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Capture a PayPal order the buyer approved.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Guarded capture of an approved PayPal order

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.capture_payment(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def create_pay_pal_order(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> PayPalOrderResponse:
        """Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Create (or return) the PayPal sandbox order for an intent

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.create_pay_pal_order(
                id_, x_requested_with, idempotency_key, request_options=request_options
            ),
        )

    async def get_payment(self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None) -> PaymentDto:
        """Verified payment state.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verified payment state

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.get_payment(id_, request_options=request_options))

    async def receive_pay_pal_webhook(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> WebhookAckResponse:
        """PayPal webhook receiver (signature-verified).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            PayPal webhook receiver (signature-verified)

        Raises:
            ApiError: The request conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error``
                is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.receive_pay_pal_webhook(request_options=request_options))

    async def refund_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: RefundRequest | RefundRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> PaymentsRefundResponse:
        """Owner-authorized refund. Requires the OWNER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Refund part or all of a captured payment.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Owner-authorized refund

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Refused by policy (for example ``CAPTURE_REFUSED``); see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.refund_payment(
                id_, x_requested_with, idempotency_key, body, request_options=request_options
            ),
        )

    async def sync_payment(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> PaymentDto:
        """Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Re-read the PayPal order and apply its state (never captures)

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.sync_payment(id_, x_requested_with, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> AsyncPaymentsApiWithRawResponse:
        return self._with_raw_response


class PaymentsApiWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def capture_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CapturePaymentRequest | CapturePaymentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[PaymentsCaptureResponse, CapturePaymentErrorBody]:
        """Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Capture a PayPal order the buyer approved.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/payments/{id}/capture"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[CapturePaymentRequest | CapturePaymentRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PaymentsCaptureResponse],
            error_mapper=capture_payment_error_mapper,
            request_options=request_options,
        )

    def create_pay_pal_order(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[PayPalOrderResponse, CreatePayPalOrderErrorBody]:
        """Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/intents/{id}/paypal-order"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PayPalOrderResponse],
            error_mapper=create_pay_pal_order_error_mapper,
            request_options=request_options,
        )

    def get_payment(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PaymentDto, GetPaymentErrorBody]:
        """Verified payment state.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/payments/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PaymentDto],
            error_mapper=get_payment_error_mapper,
            request_options=request_options,
        )

    def receive_pay_pal_webhook(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[WebhookAckResponse, ReceivePayPalWebhookErrorBody]:
        """PayPal webhook receiver (signature-verified).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/webhooks/paypal"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            decoder=json_decoder[WebhookAckResponse],
            error_mapper=receive_pay_pal_webhook_error_mapper,
            request_options=request_options,
        )

    def refund_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: RefundRequest | RefundRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[PaymentsRefundResponse, RefundPaymentErrorBody]:
        """Owner-authorized refund. Requires the OWNER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Refund part or all of a captured payment.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/payments/{id}/refund"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[RefundRequest | RefundRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PaymentsRefundResponse],
            error_mapper=refund_payment_error_mapper,
            request_options=request_options,
        )

    def sync_payment(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PaymentDto, SyncPaymentErrorBody]:
        """Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/payments/{id}/sync"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[PaymentDto],
            error_mapper=sync_payment_error_mapper,
            request_options=request_options,
        )


class AsyncPaymentsApiWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def capture_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: CapturePaymentRequest | CapturePaymentRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[PaymentsCaptureResponse, CapturePaymentErrorBody]:
        """Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Capture a PayPal order the buyer approved.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/payments/{id}/capture"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[CapturePaymentRequest | CapturePaymentRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PaymentsCaptureResponse],
            error_mapper=capture_payment_error_mapper,
            request_options=request_options,
        )

    async def create_pay_pal_order(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[PayPalOrderResponse, CreatePayPalOrderErrorBody]:
        """Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an
        ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/intents/{id}/paypal-order"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PayPalOrderResponse],
            error_mapper=create_pay_pal_order_error_mapper,
            request_options=request_options,
        )

    async def get_payment(
        self, id_: UUID, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PaymentDto, GetPaymentErrorBody]:
        """Verified payment state.

        Args:
            id_: Resource id (UUID).
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/payments/{id}"),
            path_params=[param[UUID]("id", id_)],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PaymentDto],
            error_mapper=get_payment_error_mapper,
            request_options=request_options,
        )

    async def receive_pay_pal_webhook(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[WebhookAckResponse, ReceivePayPalWebhookErrorBody]:
        """PayPal webhook receiver (signature-verified).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/webhooks/paypal"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            decoder=async_json_decoder[WebhookAckResponse],
            error_mapper=receive_pay_pal_webhook_error_mapper,
            request_options=request_options,
        )

    async def refund_payment(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        idempotency_key: str,
        body: RefundRequest | RefundRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[PaymentsRefundResponse, RefundPaymentErrorBody]:
        """Owner-authorized refund. Requires the OWNER role. Idempotent: send an ``Idempotency-Key``.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            idempotency_key: A unique key per user action; retries with the same key return the first result.
            body: Refund part or all of a captured payment.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/payments/{id}/refund"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[str]("Idempotency-Key", idempotency_key),
            ],
            body=json_body[RefundRequest | RefundRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PaymentsRefundResponse],
            error_mapper=refund_payment_error_mapper,
            request_options=request_options,
        )

    async def sync_payment(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[PaymentDto, SyncPaymentErrorBody]:
        """Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/payments/{id}/sync"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[PaymentDto],
            error_mapper=sync_payment_error_mapper,
            request_options=request_options,
        )
