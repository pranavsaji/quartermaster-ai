from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .catalog_item_dto import CatalogItemDto, CatalogItemDtoDict


class SuppliersCatalogResponse(SdkBaseModel):
    item: CatalogItemDto
    """A supplier catalog listing (product, pack size, price)."""


class SuppliersCatalogResponseDict(TypedDict):
    item: CatalogItemDtoDict
