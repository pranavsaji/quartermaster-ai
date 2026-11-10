from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ForecastLineDto(SdkBaseModel):
    """Reorder recommendation for one stock item."""

    inventory_item_id: str
    """Id of the related inventory item."""

    sku: str
    """Stock-keeping unit code."""

    name: str
    """Display name."""

    unit: str
    """Unit of measure (each, liter, case...)."""

    base_daily_usage: float
    demand_multiplier: float
    """Demand relative to normal (1 = normal, 1.25 = 25% busier)."""

    forecast_daily_usage: float
    lead_time_days: int
    """Days from order to delivery."""

    safety_stock: int
    """Units to keep on hand as a buffer."""

    coverage_days: int
    """Days of usage an order should cover."""

    on_hand: int
    """Units currently in stock."""

    inbound_confirmed: int
    committed: int
    available: int
    reorder_point: int
    target_stock: float
    needs_reorder: bool
    suggested_quantity: float
    explanation: str


class ForecastLineDtoDict(TypedDict):
    inventory_item_id: str
    sku: str
    name: str
    unit: str
    base_daily_usage: float
    demand_multiplier: float
    forecast_daily_usage: float
    lead_time_days: int
    safety_stock: int
    coverage_days: int
    on_hand: int
    inbound_confirmed: int
    committed: int
    available: int
    reorder_point: int
    target_stock: float
    needs_reorder: bool
    suggested_quantity: float
    explanation: str
