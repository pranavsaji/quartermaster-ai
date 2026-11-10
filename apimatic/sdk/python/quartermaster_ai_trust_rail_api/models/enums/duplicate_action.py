from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class DuplicateAction(str, Enum):
    """What happens to a likely duplicate order: REVIEW or BLOCK."""

    REVIEW = "REVIEW"
    BLOCK = "BLOCK"

    __str__ = str.__str__


DuplicateActionOrStr: TypeAlias = Annotated[DuplicateAction | str, open_enum_validator(DuplicateAction)]
