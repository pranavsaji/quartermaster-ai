from __future__ import annotations

from typing import Literal
from uuid import UUID

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.allowed_category import AllowedCategoryOrStr
from .enums.duplicate_action import DuplicateActionOrStr
from .enums.market_price_action import MarketPriceActionOrStr


class SpendMandateInput(SdkBaseModel):
    """A new Spend Mandate version (optimistic concurrency on ``expected_version``)."""

    currency: Literal["USD"] = "USD"
    """ISO 4217 currency code."""

    weekly_budget_minor: int
    """Weekly budget, in minor units (cents)."""

    per_order_limit_minor: int
    """Per order limit, in minor units (cents)."""

    auto_approval_limit_minor: int
    """Auto approval limit, in minor units (cents)."""

    human_approval_required: bool
    """An owner must approve every purchase (always true). Always true."""

    approved_supplier_ids: list[UUID]
    """Suppliers the owner has approved for payment."""

    allowed_categories: list[AllowedCategoryOrStr]
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
    expected_version: int
    """The mandate version being edited (refused if it changed meanwhile)."""


class SpendMandateInputDict(TypedDict):
    currency: Literal["USD"]
    weekly_budget_minor: int
    per_order_limit_minor: int
    auto_approval_limit_minor: int
    human_approval_required: bool
    approved_supplier_ids: list[UUID]
    allowed_categories: list[AllowedCategoryOrStr]
    max_market_price_premium_pct: int
    market_price_action: MarketPriceActionOrStr
    duplicate_window_hours: int
    duplicate_action: DuplicateActionOrStr
    subscriptions_allowed: bool
    certificate_ttl_minutes: int
    max_quantity_multiple_of_need: float
    expected_version: int
