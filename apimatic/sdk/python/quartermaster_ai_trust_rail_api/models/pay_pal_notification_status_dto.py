from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class PayPalNotificationStatusDto(SdkBaseModel):
    """Whether PayPal's signed notifications (webhooks) are reaching this deployment for an organisation."""

    configured: bool
    last_received_at: str | None
    """When last received happened (ISO 8601, UTC)."""

    last_event_type: str | None
    received_24h: int
    unconfirmed_captures_7d: int
    """Completed captures in the last 7 days with no verified PayPal notification."""

    rejected_signatures_24h: int


class PayPalNotificationStatusDtoDict(TypedDict):
    configured: bool
    last_received_at: str | None
    last_event_type: str | None
    received_24h: int
    unconfirmed_captures_7d: int
    rejected_signatures_24h: int
