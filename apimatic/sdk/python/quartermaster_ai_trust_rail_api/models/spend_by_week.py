from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class SpendByWeek(SdkBaseModel):
    week_start: str
    captured_minor: int
    """Captured, in minor units (cents)."""

    reserved_minor: int
    """Reserved, in minor units (cents)."""


class SpendByWeekDict(TypedDict):
    week_start: str
    captured_minor: int
    reserved_minor: int
