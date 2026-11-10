from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.outcome import OutcomeOrStr


class WebhookAckResponse(SdkBaseModel):
    """``POST /webhooks/paypal``: acknowledgement PayPal receives for a verified event."""

    received: bool
    """Always true: the notification was accepted. Always true."""

    outcome: OutcomeOrStr
    """How the notification was handled."""


class WebhookAckResponseDict(TypedDict):
    received: bool
    outcome: OutcomeOrStr
