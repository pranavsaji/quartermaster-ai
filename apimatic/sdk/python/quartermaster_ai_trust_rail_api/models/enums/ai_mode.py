from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class AiMode(str, Enum):
    """Whether the language model or the deterministic fallback interpreted a request."""

    LLM = "LLM"
    DETERMINISTIC_FALLBACK = "DETERMINISTIC_FALLBACK"

    __str__ = str.__str__


AiModeOrStr: TypeAlias = Annotated[AiMode | str, open_enum_validator(AiMode)]
