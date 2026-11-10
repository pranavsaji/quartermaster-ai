from __future__ import annotations

from typing import Literal
from uuid import UUID

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, SdkBaseModel
from .line1 import Line1, Line1Dict


class AnalyzeInvoiceRequest(SdkBaseModel):
    """A supplier invoice to match against its purchase order and delivery."""

    supplier_id: UUID
    """Id of the related supplier."""

    purchase_order_id: OptionalNullable[UUID] = UNSET
    """Id of the related purchase order."""

    invoice_number: str
    invoice_date: str
    """Invoice date (YYYY-MM-DD)."""

    currency: Literal["USD"] = "USD"
    """ISO 4217 currency code."""

    lines: list[Line1]
    """Line items."""

    total_minor: int
    """Total, in minor units (cents)."""

    notes: Optional[str] = UNSET


class AnalyzeInvoiceRequestDict(TypedDict):
    supplier_id: UUID
    purchase_order_id: NotRequired[UUID | None]
    invoice_number: str
    invoice_date: str
    currency: Literal["USD"]
    lines: list[Line1Dict]
    total_minor: int
    notes: NotRequired[str]
