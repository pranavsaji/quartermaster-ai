from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Totals(SdkBaseModel):
    approved_spend_minor: int
    """Approved spend, in minor units (cents)."""

    captured_spend_minor: int
    """Captured spend, in minor units (cents)."""

    refunded_minor: int
    """Refunded, in minor units (cents)."""

    orders_paid: int
    orders_blocked: int
    pending_approvals: int
    requests_total: int
    """Number of requests."""


class TotalsDict(TypedDict):
    approved_spend_minor: int
    captured_spend_minor: int
    refunded_minor: int
    orders_paid: int
    orders_blocked: int
    pending_approvals: int
    requests_total: int
