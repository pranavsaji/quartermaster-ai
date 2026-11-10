from __future__ import annotations

from uuid import UUID

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Line(SdkBaseModel):
    purchase_order_item_id: UUID
    """Id of the related purchase order item."""

    quantity_received: int


class LineDict(TypedDict):
    purchase_order_item_id: UUID
    quantity_received: int
