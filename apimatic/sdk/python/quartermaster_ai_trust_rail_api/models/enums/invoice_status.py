from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class InvoiceStatus(str, Enum):
    """Invoice match outcome."""

    MATCHED = "MATCHED"
    DISCREPANCY = "DISCREPANCY"
    DUPLICATE = "DUPLICATE"
    UNMATCHED = "UNMATCHED"

    __str__ = str.__str__


InvoiceStatusOrStr: TypeAlias = Annotated[InvoiceStatus | str, open_enum_validator(InvoiceStatus)]
