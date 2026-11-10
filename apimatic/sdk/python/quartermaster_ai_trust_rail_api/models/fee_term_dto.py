from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.kind1 import Kind1OrStr


class FeeTermDto(SdkBaseModel):
    """A published supplier fee or shipping term; only listed fees are authorised."""

    code: str
    """Stable machine-readable code."""

    label: str
    kind: Kind1OrStr
    """Kind of entry."""

    amount_minor: int
    """Amount, in minor units (cents)."""

    waived_over_minor: int | None
    """Waived over, in minor units (cents)."""


class FeeTermDtoDict(TypedDict):
    code: str
    label: str
    kind: Kind1OrStr
    amount_minor: int
    waived_over_minor: int | None
