from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ProcurementTimeMs(SdkBaseModel):
    """Procurement time, in milliseconds."""

    median: float | None
    p90: float | None


class ProcurementTimeMsDict(TypedDict):
    median: float | None
    p90: float | None
