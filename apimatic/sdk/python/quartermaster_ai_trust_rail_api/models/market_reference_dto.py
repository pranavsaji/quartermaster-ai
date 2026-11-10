from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.status1 import Status1OrStr
from .market_quote_dto import MarketQuoteDto, MarketQuoteDtoDict


class MarketReferenceDto(SdkBaseModel):
    """The market reference price for an item."""

    inventory_item_id: str
    """Id of the related inventory item."""

    reference_unit_price_minor: int | None
    """Reference unit price, in minor units (cents)."""

    sample_size: float
    observed_at: str | None
    """When observed happened (ISO 8601, UTC)."""

    status: Status1OrStr
    """Current status."""

    quotes: list[MarketQuoteDto]


class MarketReferenceDtoDict(TypedDict):
    inventory_item_id: str
    reference_unit_price_minor: int | None
    sample_size: float
    observed_at: str | None
    status: Status1OrStr
    quotes: list[MarketQuoteDtoDict]
