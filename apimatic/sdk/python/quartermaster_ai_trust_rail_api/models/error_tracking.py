from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ErrorTracking(SdkBaseModel):
    open_errors: int
    sentry: bool


class ErrorTrackingDict(TypedDict):
    open_errors: int
    sentry: bool
