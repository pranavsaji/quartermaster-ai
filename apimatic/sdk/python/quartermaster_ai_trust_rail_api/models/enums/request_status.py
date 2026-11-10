from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class RequestStatus(str, Enum):
    """Procurement request lifecycle."""

    DRAFT = "DRAFT"
    RESEARCHING = "RESEARCHING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    BLOCKED = "BLOCKED"
    APPROVED = "APPROVED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    FULFILLED = "FULFILLED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

    __str__ = str.__str__


RequestStatusOrStr: TypeAlias = Annotated[RequestStatus | str, open_enum_validator(RequestStatus)]
