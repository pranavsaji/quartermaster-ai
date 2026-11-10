from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class Source(str, Enum):
    """Where the error came from."""

    API = "api"
    WEB = "web"
    JOB = "job"
    MONITOR = "monitor"

    __str__ = str.__str__


SourceOrStr: TypeAlias = Annotated[Source | str, open_enum_validator(Source)]
