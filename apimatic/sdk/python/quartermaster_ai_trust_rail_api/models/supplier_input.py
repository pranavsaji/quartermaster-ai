from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, SdkBaseModel
from .fee_term import FeeTerm, FeeTermDict


class SupplierInput(SdkBaseModel):
    """Fields for creating or updating a supplier."""

    name: str
    """Display name."""

    website: OptionalNullable[str] = UNSET
    """Supplier website."""

    description: OptionalNullable[str] = UNSET
    """Free-text description."""

    lead_time_days: int
    """Days from order to delivery."""

    tax_rate_bps: int
    """Tax rate, in basis points (825 = 8.25%)."""

    fee_terms: Optional[list[FeeTerm]] = UNSET
    """Published fees and shipping terms; any other fee in a quote is unauthorised."""

    active: bool = True
    """Whether the record is in use."""

    checkout_eligible: bool = True
    """Whether orders from this supplier can be paid through PayPal checkout."""


class SupplierInputDict(TypedDict):
    name: str
    website: NotRequired[str | None]
    description: NotRequired[str | None]
    lead_time_days: int
    tax_rate_bps: int
    fee_terms: NotRequired[list[FeeTermDict]]
    active: NotRequired[bool]
    checkout_eligible: NotRequired[bool]
