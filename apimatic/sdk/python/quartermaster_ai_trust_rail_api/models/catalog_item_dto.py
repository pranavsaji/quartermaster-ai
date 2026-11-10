from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.product_category import ProductCategoryOrStr


class CatalogItemDto(SdkBaseModel):
    """A supplier catalog listing (product, pack size, price)."""

    id: str
    """Unique identifier (UUID)."""

    supplier_id: str
    """Id of the related supplier."""

    sku: str
    """Stock-keeping unit code."""

    title: str
    """Short title."""

    description: str
    """Free-text description."""

    category: ProductCategoryOrStr
    """Product category used by the Spend Mandate's category rules."""

    inventory_item_id: str | None
    """Id of the related inventory item."""

    pack_quantity: int
    """Units in one pack."""

    unit_price_minor: int
    """Unit price, in minor units (cents)."""

    currency: str
    """ISO 4217 currency code."""

    in_stock: bool
    """Whether the supplier currently has it in stock."""

    recurring: bool
    """A recurring subscription rather than a one-off purchase."""

    quarantined: bool
    """Flagged by injection screening: withheld from the agent, and TrustRail blocks carts with it."""

    quarantine_reason: str | None
    """Detection rules that triggered the quarantine."""

    updated_at: str
    """When updated happened (ISO 8601, UTC)."""


class CatalogItemDtoDict(TypedDict):
    id: str
    supplier_id: str
    sku: str
    title: str
    description: str
    category: ProductCategoryOrStr
    inventory_item_id: str | None
    pack_quantity: int
    unit_price_minor: int
    currency: str
    in_stock: bool
    recurring: bool
    quarantined: bool
    quarantine_reason: str | None
    updated_at: str
