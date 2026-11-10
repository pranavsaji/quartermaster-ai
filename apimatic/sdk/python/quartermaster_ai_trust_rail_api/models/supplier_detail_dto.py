from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .catalog_item_dto import CatalogItemDto, CatalogItemDtoDict
from .enums.data_source import DataSourceOrStr
from .fee_term_dto import FeeTermDto, FeeTermDtoDict


class SupplierDetailDto(SdkBaseModel):
    """A supplier with its catalog."""

    id: str
    """Unique identifier (UUID)."""

    name: str
    """Display name."""

    approved: bool
    """Approved in the current Spend Mandate."""

    active: bool
    """Whether the record is in use."""

    checkout_eligible: bool
    """Whether orders from this supplier can be paid through PayPal checkout."""

    lead_time_days: int
    """Days from order to delivery."""

    tax_rate_bps: int
    """Tax rate, in basis points (825 = 8.25%)."""

    fee_terms: list[FeeTermDto]
    """Published fees and shipping terms; any other fee in a quote is unauthorised."""

    website: str | None
    """Supplier website."""

    description: str | None
    """Free-text description."""

    quarantined: bool
    """Flagged by prompt-injection screening: withheld from the agent and blocked by TrustRail."""

    catalog_items: int
    data_source: DataSourceOrStr
    """Where a piece of commercial data came from (shown as a label in the UI)."""

    catalog: list[CatalogItemDto]
    created_at: str
    """When created happened (ISO 8601, UTC)."""


class SupplierDetailDtoDict(TypedDict):
    id: str
    name: str
    approved: bool
    active: bool
    checkout_eligible: bool
    lead_time_days: int
    tax_rate_bps: int
    fee_terms: list[FeeTermDtoDict]
    website: str | None
    description: str | None
    quarantined: bool
    catalog_items: int
    data_source: DataSourceOrStr
    catalog: list[CatalogItemDtoDict]
    created_at: str
