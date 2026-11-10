from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Role(str, Enum):
    """Workspace role: owners approve and pay, managers request, viewers read."""

    OWNER = "OWNER"
    MANAGER = "MANAGER"
    VIEWER = "VIEWER"

    __str__ = str.__str__


RoleOrStr: TypeAlias = Annotated[Role | str, open_enum_validator(Role)]
