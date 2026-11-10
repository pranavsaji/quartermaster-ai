from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .invoice_dto import InvoiceDto, InvoiceDtoDict


class InvoicesResponse(SdkBaseModel):
    items: list[InvoiceDto]


class InvoicesResponseDict(TypedDict):
    items: list[InvoiceDtoDict]
