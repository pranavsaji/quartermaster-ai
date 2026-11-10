from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Alerting(SdkBaseModel):
    email: bool
    """Email address."""

    webhook: bool
    recipients: int


class AlertingDict(TypedDict):
    email: bool
    webhook: bool
    recipients: int
