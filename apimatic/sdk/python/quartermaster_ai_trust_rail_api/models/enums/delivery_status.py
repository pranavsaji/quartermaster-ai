from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class DeliveryStatus(str, Enum):
    """Delivery progress."""

    SCHEDULED = "SCHEDULED"
    IN_TRANSIT = "IN_TRANSIT"
    DELAYED = "DELAYED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

    __str__ = str.__str__


DeliveryStatusOrStr: TypeAlias = Annotated[DeliveryStatus | str, open_enum_validator(DeliveryStatus)]
