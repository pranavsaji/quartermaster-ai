from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class DataSource(str, Enum):
    """Where a piece of commercial data came from (shown as a label in the UI)."""

    CHANNEL3_MARKET = "CHANNEL3_MARKET"
    SANDBOX_SUPPLIER = "SANDBOX_SUPPLIER"
    SYNTHETIC = "SYNTHETIC"
    USER_ENTERED = "USER_ENTERED"

    __str__ = str.__str__


DataSourceOrStr: TypeAlias = Annotated[DataSource | str, open_enum_validator(DataSource)]
