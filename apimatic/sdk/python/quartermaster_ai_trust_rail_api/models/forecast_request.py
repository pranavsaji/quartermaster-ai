from __future__ import annotations

from uuid import UUID

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ForecastRequest(SdkBaseModel):
    """Parameters for a reorder forecast."""

    inventory_item_ids: Optional[list[UUID]] = UNSET
    """Ids of the related inventory items."""

    demand_multiplier: float = 1.0
    """Demand relative to normal (1 = normal, 1.25 = 25% busier)."""

    horizon_days: Optional[int] = UNSET
    """Horizon, in days."""


class ForecastRequestDict(TypedDict):
    inventory_item_ids: NotRequired[list[UUID]]
    demand_multiplier: NotRequired[float]
    horizon_days: NotRequired[int]
