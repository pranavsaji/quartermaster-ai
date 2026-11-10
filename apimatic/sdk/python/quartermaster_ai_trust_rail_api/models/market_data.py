from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class MarketData(SdkBaseModel):
    provider: Literal["channel3"] = "channel3"
    """Provider in use."""

    enabled: bool
    """Whether the feature is turned on."""


class MarketDataDict(TypedDict):
    provider: Literal["channel3"]
    enabled: bool
