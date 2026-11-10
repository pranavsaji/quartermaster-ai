from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.reason import ReasonOrStr


class InventoryAdjustmentRequest(SdkBaseModel):
    """An authorised stock change with a reason."""

    quantity_delta: int
    reason: ReasonOrStr
    """Reason given by the person making the change."""

    note: Optional[str] = UNSET
    """Optional note."""

    expected_on_hand: Optional[int] = UNSET


class InventoryAdjustmentRequestDict(TypedDict):
    quantity_delta: int
    reason: ReasonOrStr
    note: NotRequired[str]
    expected_on_hand: NotRequired[int]
