from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, OptionalNullable, SdkBaseModel


class Line1(SdkBaseModel):
    sku: OptionalNullable[str] = UNSET
    """Stock-keeping unit code."""

    description: str
    """Free-text description."""

    quantity: int
    unit_price_minor: int
    """Unit price, in minor units (cents)."""

    line_total_minor: int
    """Line total, in minor units (cents)."""


class Line1Dict(TypedDict):
    sku: NotRequired[str | None]
    description: str
    quantity: int
    unit_price_minor: int
    line_total_minor: int
