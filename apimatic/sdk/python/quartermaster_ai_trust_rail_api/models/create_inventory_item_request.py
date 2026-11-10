from __future__ import annotations

from uuid import UUID

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, SdkBaseModel
from .enums.category import CategoryOrStr


class CreateInventoryItemRequest(SdkBaseModel):
    """A new stock item, including its opening on-hand count."""

    sku: str
    """Stock-keeping unit code."""

    name: str
    """Display name."""

    category: CategoryOrStr
    """Product category."""

    unit: str
    """Unit of measure (each, liter, case...)."""

    safety_stock: int
    """Units to keep on hand as a buffer."""

    coverage_days: int
    """Days of usage an order should cover."""

    lead_time_days_override: OptionalNullable[int] = UNSET
    """Lead time for this item, overriding the supplier's (null = use supplier's)."""

    preferred_supplier_id: OptionalNullable[UUID] = UNSET
    """Id of the related preferred supplier."""

    search_query: str
    """Phrase used to look up market prices (Channel3)."""

    keywords: Optional[list[str]] = UNSET
    """Words that identify this item in natural-language requests."""

    on_hand: int = 0
    """Units currently in stock."""


class CreateInventoryItemRequestDict(TypedDict):
    sku: str
    name: str
    category: CategoryOrStr
    unit: str
    safety_stock: int
    coverage_days: int
    lead_time_days_override: NotRequired[int | None]
    preferred_supplier_id: NotRequired[UUID | None]
    search_query: str
    keywords: NotRequired[list[str]]
    on_hand: NotRequired[int]
