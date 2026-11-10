from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class RefundRequest(SdkBaseModel):
    """Refund part or all of a captured payment."""

    amount_minor: Optional[int] = UNSET
    """Amount, in minor units (cents)."""

    reason: str
    """Reason given by the person making the change."""


class RefundRequestDict(TypedDict):
    amount_minor: NotRequired[int]
    reason: str
