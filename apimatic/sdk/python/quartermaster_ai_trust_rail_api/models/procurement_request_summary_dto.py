from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.request_status import RequestStatusOrStr


class ProcurementRequestSummaryDto(SdkBaseModel):
    """A procurement request in a list."""

    id: str
    """Unique identifier (UUID)."""

    status: RequestStatusOrStr
    """Procurement request lifecycle."""

    instruction: str
    """The natural-language instruction from the restaurant."""

    total_minor: int | None
    """Total, in minor units (cents)."""

    currency: str
    """ISO 4217 currency code."""

    created_at: str
    """When created happened (ISO 8601, UTC)."""


class ProcurementRequestSummaryDtoDict(TypedDict):
    id: str
    status: RequestStatusOrStr
    instruction: str
    total_minor: int | None
    currency: str
    created_at: str
