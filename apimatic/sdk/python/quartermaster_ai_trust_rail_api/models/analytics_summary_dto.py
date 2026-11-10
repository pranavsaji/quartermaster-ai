from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .budget_dto import BudgetDto, BudgetDtoDict
from .decisions_by_kind import DecisionsByKind, DecisionsByKindDict
from .deliveries import Deliveries, DeliveriesDict
from .findings_by_type import FindingsByType, FindingsByTypeDict
from .inventory import Inventory, InventoryDict
from .procurement_time_ms import ProcurementTimeMs, ProcurementTimeMsDict
from .security import Security, SecurityDict
from .spend_by_category import SpendByCategory, SpendByCategoryDict
from .spend_by_supplier import SpendBySupplier, SpendBySupplierDict
from .spend_by_week import SpendByWeek, SpendByWeekDict
from .totals import Totals, TotalsDict


class AnalyticsSummaryDto(SdkBaseModel):
    """Spend, budget, procurement and security outcomes for the workspace."""

    currency: str
    """ISO 4217 currency code."""

    budget: BudgetDto
    """The current weekly budget: limit, reserved and spent amounts."""

    totals: Totals
    security: Security
    inventory: Inventory
    deliveries: Deliveries
    spend_by_week: list[SpendByWeek]
    spend_by_supplier: list[SpendBySupplier]
    """Captured spend net of refunds, per supplier, largest first."""

    spend_by_category: list[SpendByCategory]
    decisions_by_kind: list[DecisionsByKind]
    findings_by_type: list[FindingsByType]
    procurement_time_ms: ProcurementTimeMs
    """Procurement time, in milliseconds."""


class AnalyticsSummaryDtoDict(TypedDict):
    currency: str
    budget: BudgetDtoDict
    totals: TotalsDict
    security: SecurityDict
    inventory: InventoryDict
    deliveries: DeliveriesDict
    spend_by_week: list[SpendByWeekDict]
    spend_by_supplier: list[SpendBySupplierDict]
    spend_by_category: list[SpendByCategoryDict]
    decisions_by_kind: list[DecisionsByKindDict]
    findings_by_type: list[FindingsByTypeDict]
    procurement_time_ms: ProcurementTimeMsDict
