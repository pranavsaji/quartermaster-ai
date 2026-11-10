from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Payments(SdkBaseModel):
    capture_pending: int
    oldest_pending_minutes: float | None
    """Oldest pending, in minutes."""


class PaymentsDict(TypedDict):
    capture_pending: int
    oldest_pending_minutes: float | None
