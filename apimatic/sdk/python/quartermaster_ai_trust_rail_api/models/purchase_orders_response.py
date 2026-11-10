from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .purchase_order_dto import PurchaseOrderDto, PurchaseOrderDtoDict


class PurchaseOrdersResponse(SdkBaseModel):
    items: list[PurchaseOrderDto]
    next_cursor: str | None
    """Pass as ``cursor`` for the next page; null on the last page."""


class PurchaseOrdersResponseDict(TypedDict):
    items: list[PurchaseOrderDtoDict]
    next_cursor: str | None
