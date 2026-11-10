from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .payment_dto import PaymentDto, PaymentDtoDict


class PayPalOrderResponse(SdkBaseModel):
    """``POST /intents/:id/paypal-order``."""

    payment: PaymentDto
    """A PayPal payment attempt for a purchase order."""

    paypal_order_id: str
    """PayPal Orders v2 order id."""


class PayPalOrderResponseDict(TypedDict):
    payment: PaymentDtoDict
    paypal_order_id: str
