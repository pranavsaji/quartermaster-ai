from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .line import Line, LineDict


class ReceiveDeliveryRequest(SdkBaseModel):
    """Quantities received per purchase order line."""

    lines: list[Line]
    """Line items."""

    note: Optional[str] = UNSET
    """Optional note."""


class ReceiveDeliveryRequestDict(TypedDict):
    lines: list[LineDict]
    note: NotRequired[str]
