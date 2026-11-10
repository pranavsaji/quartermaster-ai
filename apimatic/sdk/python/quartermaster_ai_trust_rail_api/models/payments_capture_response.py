from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .payment_dto import PaymentDto, PaymentDtoDict
from .purchase_order_dto import PurchaseOrderDto, PurchaseOrderDtoDict


class PaymentsCaptureResponse(SdkBaseModel):
    payment: PaymentDto
    """A PayPal payment attempt for a purchase order."""

    purchase_order: PurchaseOrderDto
    """A proposed or committed purchase order (immutable once proposed)."""


class PaymentsCaptureResponseDict(TypedDict):
    payment: PaymentDtoDict
    purchase_order: PurchaseOrderDtoDict
