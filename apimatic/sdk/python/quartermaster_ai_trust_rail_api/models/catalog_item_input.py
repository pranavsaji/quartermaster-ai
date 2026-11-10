from __future__ import annotations

from uuid import UUID

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, OptionalNullable, SdkBaseModel
from .enums.category import CategoryOrStr


class CatalogItemInput(SdkBaseModel):
    """Fields for creating or updating a catalog listing."""

    sku: str
    """Stock-keeping unit code."""

    title: str
    """Short title."""

    description: str = ""
    """Free-text description."""

    category: CategoryOrStr
    """Product category."""

    inventory_item_id: OptionalNullable[UUID] = UNSET
    """Id of the related inventory item."""

    pack_quantity: int
    """Units in one pack."""

    unit_price_minor: int
    """Unit price, in minor units (cents)."""

    in_stock: bool = True
    """Whether the supplier currently has it in stock."""

    recurring: bool = False
    """A recurring subscription rather than a one-off purchase."""


class CatalogItemInputDict(TypedDict):
    sku: str
    title: str
    description: NotRequired[str]
    category: CategoryOrStr
    inventory_item_id: NotRequired[UUID | None]
    pack_quantity: int
    unit_price_minor: int
    in_stock: NotRequired[bool]
    recurring: NotRequired[bool]
