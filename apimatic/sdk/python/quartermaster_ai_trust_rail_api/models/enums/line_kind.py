from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class LineKind(str, Enum):
    """Kind of cart or invoice line."""

    PRODUCT = "PRODUCT"
    SHIPPING = "SHIPPING"
    TAX = "TAX"
    FEE = "FEE"

    __str__ = str.__str__


LineKindOrStr: TypeAlias = Annotated[LineKind | str, open_enum_validator(LineKind)]
