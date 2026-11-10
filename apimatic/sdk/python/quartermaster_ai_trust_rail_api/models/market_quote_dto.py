from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class MarketQuoteDto(SdkBaseModel):
    """A market price quote from Channel3, used as a reference only."""

    id: str
    """Unique identifier (UUID)."""

    source: Literal["CHANNEL3_MARKET"] = "CHANNEL3_MARKET"
    """Where the error came from."""

    title: str
    """Short title."""

    merchant_domain: str
    url: str
    price_minor: int
    """Price, in minor units (cents)."""

    currency: str
    """ISO 4217 currency code."""

    pack_quantity: int | None
    """Units in one pack."""

    normalized_unit_price_minor: int | None
    """Normalized unit price, in minor units (cents)."""

    comparable: bool
    observed_at: str
    """When observed happened (ISO 8601, UTC)."""

    availability: str


class MarketQuoteDtoDict(TypedDict):
    id: str
    source: Literal["CHANNEL3_MARKET"]
    title: str
    merchant_domain: str
    url: str
    price_minor: int
    currency: str
    pack_quantity: int | None
    normalized_unit_price_minor: int | None
    comparable: bool
    observed_at: str
    availability: str
