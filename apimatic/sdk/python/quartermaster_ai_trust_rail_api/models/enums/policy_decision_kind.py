from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class PolicyDecisionKind(str, Enum):
    """TrustRail's verdict on a cart."""

    ALLOW = "ALLOW"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    BLOCK = "BLOCK"

    __str__ = str.__str__


PolicyDecisionKindOrStr: TypeAlias = Annotated[PolicyDecisionKind | str, open_enum_validator(PolicyDecisionKind)]
