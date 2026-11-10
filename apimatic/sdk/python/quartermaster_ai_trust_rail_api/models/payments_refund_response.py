from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .payment_dto import PaymentDto, PaymentDtoDict


class PaymentsRefundResponse(SdkBaseModel):
    payment: PaymentDto
    """A PayPal payment attempt for a purchase order."""


class PaymentsRefundResponseDict(TypedDict):
    payment: PaymentDtoDict
