from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.currency import Currency, CurrencyOrStr


class CreateProcurementRequest(SdkBaseModel):
    """A natural-language purchasing instruction for the agent."""

    instruction: str
    """The natural-language instruction from the restaurant."""

    currency: CurrencyOrStr = Currency.USD
    """ISO 4217 currency code."""

    budget_limit_minor: Optional[int] = UNSET
    """Budget limit, in minor units (cents)."""

    required_by: Optional[str] = UNSET
    """Date the goods are needed by (YYYY-MM-DD)."""

    allow_alternatives: bool = True
    demand_multiplier: Optional[float] = UNSET
    """Demand relative to normal (1 = normal, 1.25 = 25% busier)."""


class CreateProcurementRequestDict(TypedDict):
    instruction: str
    currency: NotRequired[CurrencyOrStr]
    budget_limit_minor: NotRequired[int]
    required_by: NotRequired[str]
    allow_alternatives: NotRequired[bool]
    demand_multiplier: NotRequired[float]
