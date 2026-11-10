from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class XRequestedWith(str, Enum):
    """CSRF guard: must be ``quartermaster`` on every mutation."""

    QUARTERMASTER = "quartermaster"

    __str__ = str.__str__


XRequestedWithOrStr: TypeAlias = Annotated[XRequestedWith | str, open_enum_validator(XRequestedWith)]
