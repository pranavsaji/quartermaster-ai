from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Inventory(SdkBaseModel):
    items_low: int
    items_critical: int
    items_out: int


class InventoryDict(TypedDict):
    items_low: int
    items_critical: int
    items_out: int
