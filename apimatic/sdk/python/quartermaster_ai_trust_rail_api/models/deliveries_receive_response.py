from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .delivery_dto import DeliveryDto, DeliveryDtoDict


class DeliveriesReceiveResponse(SdkBaseModel):
    delivery: DeliveryDto
    """A delivery for a paid purchase order (synthetic in the sandbox)."""


class DeliveriesReceiveResponseDict(TypedDict):
    delivery: DeliveryDtoDict
