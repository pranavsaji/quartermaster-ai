from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.payment_status import PaymentStatusOrStr


class PaymentDto(SdkBaseModel):
    """A PayPal payment attempt for a purchase order."""

    id: str
    """Unique identifier (UUID)."""

    intent_id: str
    """Id of the related intent."""

    purchase_order_id: str
    """Id of the related purchase order."""

    status: PaymentStatusOrStr
    """Payment attempt lifecycle."""

    paypal_order_id: str | None
    """PayPal Orders v2 order id."""

    paypal_capture_id: str | None
    """PayPal capture id once payment completed."""

    amount_minor: int
    """Amount, in minor units (cents)."""

    currency: str
    """ISO 4217 currency code."""

    captured_amount_minor: int | None
    """Captured amount, in minor units (cents)."""

    refunded_amount_minor: int
    """Refunded amount, in minor units (cents)."""

    failure_code: str | None
    failure_message: str | None
    created_at: str
    """When created happened (ISO 8601, UTC)."""

    updated_at: str
    """When updated happened (ISO 8601, UTC)."""

    completed_at: str | None
    """When completed happened (ISO 8601, UTC)."""


class PaymentDtoDict(TypedDict):
    id: str
    intent_id: str
    purchase_order_id: str
    status: PaymentStatusOrStr
    paypal_order_id: str | None
    paypal_capture_id: str | None
    amount_minor: int
    currency: str
    captured_amount_minor: int | None
    refunded_amount_minor: int
    failure_code: str | None
    failure_message: str | None
    created_at: str
    updated_at: str
    completed_at: str | None
