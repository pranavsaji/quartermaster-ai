from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class PurchaseOrderStatus(str, Enum):
    """Purchase order lifecycle."""

    PROPOSED = "PROPOSED"
    BLOCKED = "BLOCKED"
    SUPERSEDED = "SUPERSEDED"
    APPROVED = "APPROVED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    FULFILLED = "FULFILLED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"

    __str__ = str.__str__


PurchaseOrderStatusOrStr: TypeAlias = Annotated[PurchaseOrderStatus | str, open_enum_validator(PurchaseOrderStatus)]
