from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class SpendByCategory(SdkBaseModel):
    category: str
    """Product category."""

    captured_minor: int
    """Captured, in minor units (cents)."""


class SpendByCategoryDict(TypedDict):
    category: str
    captured_minor: int
