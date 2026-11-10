from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.data_source import DataSourceOrStr
from .enums.product_category import ProductCategoryOrStr
from .enums.status import StatusOrStr


class InventoryItemDto(SdkBaseModel):
    """A stock item with current levels, usage and reorder status."""

    id: str
    """Unique identifier (UUID)."""

    sku: str
    """Stock-keeping unit code."""

    name: str
    """Display name."""

    category: ProductCategoryOrStr
    """Product category used by the Spend Mandate's category rules."""

    unit: str
    """Unit of measure (each, liter, case...)."""

    on_hand: int
    """Units currently in stock."""

    inbound_confirmed: int
    committed: int
    available: int
    avg_daily_usage: float
    lead_time_days: int
    """Days from order to delivery."""

    safety_stock: int
    """Units to keep on hand as a buffer."""

    coverage_days: int
    """Days of usage an order should cover."""

    reorder_point: int
    days_of_cover: float | None
    status: StatusOrStr
    """Current status."""

    preferred_supplier_id: str | None
    """Id of the related preferred supplier."""

    data_source: DataSourceOrStr
    """Where a piece of commercial data came from (shown as a label in the UI)."""

    search_query: str
    """Editable details (PUT /inventory/:id round-trips them). Optional until every API build sends them; the edit form
    treats a missing value as blank."""

    keywords: list[str]
    """Words that identify this item in natural-language requests."""

    lead_time_days_override: float | None
    """Lead time for this item, overriding the supplier's (null = use supplier's)."""


class InventoryItemDtoDict(TypedDict):
    id: str
    sku: str
    name: str
    category: ProductCategoryOrStr
    unit: str
    on_hand: int
    inbound_confirmed: int
    committed: int
    available: int
    avg_daily_usage: float
    lead_time_days: int
    safety_stock: int
    coverage_days: int
    reorder_point: int
    days_of_cover: float | None
    status: StatusOrStr
    preferred_supplier_id: str | None
    data_source: DataSourceOrStr
    search_query: str
    keywords: list[str]
    lead_time_days_override: float | None
