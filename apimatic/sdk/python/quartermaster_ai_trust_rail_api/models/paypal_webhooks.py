from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class PaypalWebhooks(SdkBaseModel):
    last_received_at: str | None
    """When last received happened (ISO 8601, UTC)."""

    received_24h: int
    rejected_24h: int


class PaypalWebhooksDict(TypedDict):
    last_received_at: str | None
    received_24h: int
    rejected_24h: int
