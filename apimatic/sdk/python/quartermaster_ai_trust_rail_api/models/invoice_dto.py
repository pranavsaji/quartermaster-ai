from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.invoice_status import InvoiceStatusOrStr
from .invoice_match_dto import InvoiceMatchDto, InvoiceMatchDtoDict


class InvoiceDto(SdkBaseModel):
    """A supplier invoice and its three-way match result."""

    id: str
    """Unique identifier (UUID)."""

    supplier_id: str
    """Id of the related supplier."""

    purchase_order_id: str | None
    """Id of the related purchase order."""

    invoice_number: str
    invoice_date: str
    """Invoice date (YYYY-MM-DD)."""

    currency: str
    """ISO 4217 currency code."""

    total_minor: int
    """Total, in minor units (cents)."""

    status: InvoiceStatusOrStr
    """Invoice match outcome."""

    settlement_allowed: bool
    matches: list[InvoiceMatchDto]
    created_at: str
    """When created happened (ISO 8601, UTC)."""


class InvoiceDtoDict(TypedDict):
    id: str
    supplier_id: str
    purchase_order_id: str | None
    invoice_number: str
    invoice_date: str
    currency: str
    total_minor: int
    status: InvoiceStatusOrStr
    settlement_allowed: bool
    matches: list[InvoiceMatchDtoDict]
    created_at: str
