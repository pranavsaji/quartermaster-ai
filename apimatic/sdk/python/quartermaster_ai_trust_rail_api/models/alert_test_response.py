from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class AlertTestResponse(SdkBaseModel):
    """``POST /ops/alerts/test``: where the test alert went."""

    email_recipients: int
    emails_sent: int
    webhook_sent: bool


class AlertTestResponseDict(TypedDict):
    email_recipients: int
    emails_sent: int
    webhook_sent: bool
