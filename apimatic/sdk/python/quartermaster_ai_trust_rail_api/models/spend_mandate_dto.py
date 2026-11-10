from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.duplicate_action import DuplicateActionOrStr
from .enums.market_price_action import MarketPriceActionOrStr
from .enums.product_category import ProductCategoryOrStr
from .enums.status3 import Status3OrStr


class SpendMandateDto(SdkBaseModel):
    """The owner's Spend Mandate: what the business permits across purchases."""

    id: str
    """Unique identifier (UUID)."""

    version: int
    """Version number."""

    status: Status3OrStr
    """Current status."""

    currency: str
    """ISO 4217 currency code."""

    weekly_budget_minor: int
    """Weekly budget, in minor units (cents)."""

    per_order_limit_minor: int
    """Per order limit, in minor units (cents)."""

    auto_approval_limit_minor: int
    """Auto approval limit, in minor units (cents)."""

    human_approval_required: bool
    """An owner must approve every purchase (always true). Always true."""

    approved_supplier_ids: list[str]
    """Suppliers the owner has approved for payment."""

    allowed_categories: list[ProductCategoryOrStr]
    """Product categories purchases may contain."""

    max_market_price_premium_pct: int
    """Max market price premium, in percent."""

    market_price_action: MarketPriceActionOrStr
    """What happens when a price exceeds the market premium: REVIEW or BLOCK."""

    duplicate_window_hours: int
    """Duplicate window, in hours."""

    duplicate_action: DuplicateActionOrStr
    """What happens to a likely duplicate order: REVIEW or BLOCK."""

    subscriptions_allowed: bool
    """Whether recurring purchases are allowed."""

    certificate_ttl_minutes: int
    """Certificate ttl, in minutes."""

    max_quantity_multiple_of_need: float
    created_by: str
    created_at: str
    """When created happened (ISO 8601, UTC)."""


class SpendMandateDtoDict(TypedDict):
    id: str
    version: int
    status: Status3OrStr
    currency: str
    weekly_budget_minor: int
    per_order_limit_minor: int
    auto_approval_limit_minor: int
    human_approval_required: bool
    approved_supplier_ids: list[str]
    allowed_categories: list[ProductCategoryOrStr]
    max_market_price_premium_pct: int
    market_price_action: MarketPriceActionOrStr
    duplicate_window_hours: int
    duplicate_action: DuplicateActionOrStr
    subscriptions_allowed: bool
    certificate_ttl_minutes: int
    max_quantity_multiple_of_need: float
    created_by: str
    created_at: str
