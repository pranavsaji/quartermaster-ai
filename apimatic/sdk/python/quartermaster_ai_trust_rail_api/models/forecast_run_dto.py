from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .forecast_line_dto import ForecastLineDto, ForecastLineDtoDict


class ForecastRunDto(SdkBaseModel):
    """A stored forecast run with its lines."""

    id: str
    """Unique identifier (UUID)."""

    demand_multiplier: float
    """Demand relative to normal (1 = normal, 1.25 = 25% busier)."""

    created_at: str
    """When created happened (ISO 8601, UTC)."""

    method: Literal["REORDER_POINT_V1"] = "REORDER_POINT_V1"
    lines: list[ForecastLineDto]
    """Line items."""


class ForecastRunDtoDict(TypedDict):
    id: str
    demand_multiplier: float
    created_at: str
    method: Literal["REORDER_POINT_V1"]
    lines: list[ForecastLineDtoDict]
