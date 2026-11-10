from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class BudgetDto(SdkBaseModel):
    """The current weekly budget: limit, reserved and spent amounts."""

    period_start: str
    period_end: str
    currency: str
    """ISO 4217 currency code."""

    limit_minor: int
    """Limit, in minor units (cents)."""

    reserved_minor: int
    """Reserved, in minor units (cents)."""

    spent_minor: int
    """Spent, in minor units (cents)."""

    remaining_minor: int
    """Remaining, in minor units (cents)."""


class BudgetDtoDict(TypedDict):
    period_start: str
    period_end: str
    currency: str
    limit_minor: int
    reserved_minor: int
    spent_minor: int
    remaining_minor: int
