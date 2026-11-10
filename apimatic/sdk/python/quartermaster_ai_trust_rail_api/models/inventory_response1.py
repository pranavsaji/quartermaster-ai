from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .inventory_item_dto import InventoryItemDto, InventoryItemDtoDict


class InventoryResponse1(SdkBaseModel):
    item: InventoryItemDto
    """A stock item with current levels, usage and reorder status."""


class InventoryResponse1Dict(TypedDict):
    item: InventoryItemDtoDict
