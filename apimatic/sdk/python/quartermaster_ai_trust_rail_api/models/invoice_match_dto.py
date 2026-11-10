from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.severity import SeverityOrStr


class InvoiceMatchDto(SdkBaseModel):
    """One check of the invoice match (amounts, quantities, duplicates)."""

    check: str
    passed: bool
    severity: SeverityOrStr | None
    """Severity."""

    detail: str


class InvoiceMatchDtoDict(TypedDict):
    check: str
    passed: bool
    severity: SeverityOrStr | None
    detail: str
