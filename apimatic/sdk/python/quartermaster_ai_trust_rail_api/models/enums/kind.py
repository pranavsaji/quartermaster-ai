from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Kind(str, Enum):
    """Kind of entry."""

    RENDER = "render"
    UNHANDLED = "unhandled"
    REJECTION = "rejection"

    __str__ = str.__str__


KindOrStr: TypeAlias = Annotated[Kind | str, open_enum_validator(Kind)]
