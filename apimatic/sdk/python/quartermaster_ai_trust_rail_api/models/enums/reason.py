from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Reason(str, Enum):
    """Reason given by the person making the change."""

    COUNT_CORRECTION = "COUNT_CORRECTION"
    WASTE = "WASTE"
    CONSUMPTION = "CONSUMPTION"
    MANUAL_RECEIPT = "MANUAL_RECEIPT"

    __str__ = str.__str__


ReasonOrStr: TypeAlias = Annotated[Reason | str, open_enum_validator(Reason)]
