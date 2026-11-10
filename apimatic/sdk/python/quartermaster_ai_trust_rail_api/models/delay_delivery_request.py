from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class DelayDeliveryRequest(SdkBaseModel):
    """Move a delivery's expected date, with a reason."""

    new_expected_date: str
    """New expected date (YYYY-MM-DD)."""

    reason: str
    """Reason given by the person making the change."""


class DelayDeliveryRequestDict(TypedDict):
    new_expected_date: str
    reason: str
