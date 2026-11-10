from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .delivery_dto import DeliveryDto, DeliveryDtoDict


class DeliveriesResponse(SdkBaseModel):
    items: list[DeliveryDto]


class DeliveriesResponseDict(TypedDict):
    items: list[DeliveryDtoDict]
