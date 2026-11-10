from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Severity2(str, Enum):
    """Severity."""

    BLOCK = "BLOCK"
    REVIEW = "REVIEW"

    __str__ = str.__str__


Severity2OrStr: TypeAlias = Annotated[Severity2 | str, open_enum_validator(Severity2)]
