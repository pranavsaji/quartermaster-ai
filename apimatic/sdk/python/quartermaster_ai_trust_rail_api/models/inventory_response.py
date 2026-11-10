from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .inventory_item_dto import InventoryItemDto, InventoryItemDtoDict


class InventoryResponse(SdkBaseModel):
    items: list[InventoryItemDto]


class InventoryResponseDict(TypedDict):
    items: list[InventoryItemDtoDict]
