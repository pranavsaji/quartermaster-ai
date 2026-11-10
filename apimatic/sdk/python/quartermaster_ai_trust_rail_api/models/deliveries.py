from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Deliveries(SdkBaseModel):
    scheduled: float
    delayed: float
    delivered: float


class DeliveriesDict(TypedDict):
    scheduled: float
    delayed: float
    delivered: float
