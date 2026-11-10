from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class PaymentStatus(str, Enum):
    """Payment attempt lifecycle."""

    CREATED = "CREATED"
    ORDER_CREATED = "ORDER_CREATED"
    PAYER_APPROVED = "PAYER_APPROVED"
    CAPTURE_PENDING = "CAPTURE_PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    VOIDED = "VOIDED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"

    __str__ = str.__str__


PaymentStatusOrStr: TypeAlias = Annotated[PaymentStatus | str, open_enum_validator(PaymentStatus)]
