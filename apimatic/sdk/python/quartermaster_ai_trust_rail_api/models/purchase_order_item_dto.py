from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.line_kind import LineKindOrStr
from .enums.product_category import ProductCategoryOrStr


class PurchaseOrderItemDto(SdkBaseModel):
    """A purchase order line."""

    id: str
    """Unique identifier (UUID)."""

    kind: LineKindOrStr
    """Kind of cart or invoice line."""

    sku: str | None
    """Stock-keeping unit code."""

    description: str
    """Free-text description."""

    category: ProductCategoryOrStr | None
    """Product category."""

    quantity: int
    unit_price_minor: int
    """Unit price, in minor units (cents)."""

    line_total_minor: int
    """Line total, in minor units (cents)."""

    inventory_item_id: str | None
    """Id of the related inventory item."""

    pack_quantity: int | None
    """Units in one pack."""


class PurchaseOrderItemDtoDict(TypedDict):
    id: str
    kind: LineKindOrStr
    sku: str | None
    description: str
    category: ProductCategoryOrStr | None
    quantity: int
    unit_price_minor: int
    line_total_minor: int
    inventory_item_id: str | None
    pack_quantity: int | None
