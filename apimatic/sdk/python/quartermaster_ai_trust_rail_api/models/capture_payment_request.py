from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class CapturePaymentRequest(SdkBaseModel):
    """Capture a PayPal order the buyer approved."""

    paypal_order_id: str
    """PayPal Orders v2 order id."""


class CapturePaymentRequestDict(TypedDict):
    paypal_order_id: str
