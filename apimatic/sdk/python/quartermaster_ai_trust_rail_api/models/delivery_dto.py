from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.delivery_status import DeliveryStatusOrStr


class DeliveryDto(SdkBaseModel):
    """A delivery for a paid purchase order (synthetic in the sandbox)."""

    id: str
    """Unique identifier (UUID)."""

    purchase_order_id: str
    """Id of the related purchase order."""

    supplier_id: str
    """Id of the related supplier."""

    status: DeliveryStatusOrStr
    """Delivery progress."""

    expected_date: str
    """Expected date (YYYY-MM-DD)."""

    original_expected_date: str
    """Original expected date (YYYY-MM-DD)."""

    delivered_at: str | None
    """When delivered happened (ISO 8601, UTC)."""

    delay_reason: str | None
    data_source: Literal["SYNTHETIC"] = "SYNTHETIC"
    """Where this data came from."""


class DeliveryDtoDict(TypedDict):
    id: str
    purchase_order_id: str
    supplier_id: str
    status: DeliveryStatusOrStr
    expected_date: str
    original_expected_date: str
    delivered_at: str | None
    delay_reason: str | None
    data_source: Literal["SYNTHETIC"]
