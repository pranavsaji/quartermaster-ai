from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.ai_mode import AiModeOrStr


class InterpretedIntentDto(SdkBaseModel):
    """How the request was interpreted: items, demand multiplier, budget and date."""

    inventory_item_ids: list[str]
    """Ids of the related inventory items."""

    demand_multiplier: float
    """Demand relative to normal (1 = normal, 1.25 = 25% busier)."""

    budget_limit_minor: int | None
    """Budget limit, in minor units (cents)."""

    required_by: str | None
    """Date the goods are needed by (YYYY-MM-DD)."""

    notes: str
    unsupported_requests: list[str]
    ai_mode: AiModeOrStr
    """Whether the language model or the deterministic fallback interpreted a request."""


class InterpretedIntentDtoDict(TypedDict):
    inventory_item_ids: list[str]
    demand_multiplier: float
    budget_limit_minor: int | None
    required_by: str | None
    notes: str
    unsupported_requests: list[str]
    ai_mode: AiModeOrStr
