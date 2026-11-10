from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class SpendBySupplier(SdkBaseModel):
    supplier: str
    """Supplier."""

    captured_minor: int
    """Captured, in minor units (cents)."""

    orders: int


class SpendBySupplierDict(TypedDict):
    supplier: str
    captured_minor: int
    orders: int
