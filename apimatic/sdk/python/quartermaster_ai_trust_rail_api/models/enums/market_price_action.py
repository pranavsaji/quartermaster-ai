from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class MarketPriceAction(str, Enum):
    """What happens when a price exceeds the market premium: REVIEW or BLOCK."""

    REVIEW = "REVIEW"
    BLOCK = "BLOCK"

    __str__ = str.__str__


MarketPriceActionOrStr: TypeAlias = Annotated[MarketPriceAction | str, open_enum_validator(MarketPriceAction)]
