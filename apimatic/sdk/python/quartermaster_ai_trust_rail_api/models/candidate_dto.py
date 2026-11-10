from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.data_source import DataSourceOrStr


class CandidateDto(SdkBaseModel):
    """A supplier offer the agent considered, with its policy verdict and delivered cost."""

    id: str
    """Unique identifier (UUID)."""

    inventory_item_id: str
    """Id of the related inventory item."""

    supplier_id: str
    """Id of the related supplier."""

    supplier_name: str
    supplier_approved: bool
    checkout_eligible: bool
    """Whether orders from this supplier can be paid through PayPal checkout."""

    catalog_item_id: str
    """Id of the related catalog item."""

    sku: str
    """Stock-keeping unit code."""

    title: str
    """Short title."""

    pack_quantity: int
    """Units in one pack."""

    packs: float
    units: float
    item_subtotal_minor: int
    """Item subtotal, in minor units (cents)."""

    shipping_minor: int
    """Shipping, in minor units (cents)."""

    tax_minor: int
    """Tax, in minor units (cents)."""

    fees_minor: int
    """Fees, in minor units (cents)."""

    delivered_total_minor: int
    """Delivered total, in minor units (cents)."""

    delivered_unit_cost_minor: float
    """Delivered unit cost, in minor units (cents)."""

    lead_time_days: int
    """Days from order to delivery."""

    rank: float | None
    eligible: bool
    ineligible_reasons: list[str]
    quarantined: bool
    """Flagged by prompt-injection screening: withheld from the agent and blocked by TrustRail."""

    data_source: DataSourceOrStr
    """Where a piece of commercial data came from (shown as a label in the UI)."""


class CandidateDtoDict(TypedDict):
    id: str
    inventory_item_id: str
    supplier_id: str
    supplier_name: str
    supplier_approved: bool
    checkout_eligible: bool
    catalog_item_id: str
    sku: str
    title: str
    pack_quantity: int
    packs: float
    units: float
    item_subtotal_minor: int
    shipping_minor: int
    tax_minor: int
    fees_minor: int
    delivered_total_minor: int
    delivered_unit_cost_minor: float
    lead_time_days: int
    rank: float | None
    eligible: bool
    ineligible_reasons: list[str]
    quarantined: bool
    data_source: DataSourceOrStr
