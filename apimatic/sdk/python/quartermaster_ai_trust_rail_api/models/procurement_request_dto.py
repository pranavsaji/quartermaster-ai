from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .agent_step_dto import AgentStepDto, AgentStepDtoDict
from .candidate_dto import CandidateDto, CandidateDtoDict
from .enums.request_status import RequestStatusOrStr
from .forecast_run_dto import ForecastRunDto, ForecastRunDtoDict
from .interpreted_intent_dto import InterpretedIntentDto, InterpretedIntentDtoDict
from .market_reference_dto import MarketReferenceDto, MarketReferenceDtoDict
from .purchase_order_dto import PurchaseOrderDto, PurchaseOrderDtoDict
from .recommendation_dto import RecommendationDto, RecommendationDtoDict
from .security_finding_dto import SecurityFindingDto, SecurityFindingDtoDict


class ProcurementRequestDto(SdkBaseModel):
    """A procurement request with forecast, market evidence, candidates, proposals and decisions."""

    id: str
    """Unique identifier (UUID)."""

    status: RequestStatusOrStr
    """Procurement request lifecycle."""

    instruction: str
    """The natural-language instruction from the restaurant."""

    currency: str
    """ISO 4217 currency code."""

    budget_limit_minor: int | None
    """Budget limit, in minor units (cents)."""

    required_by: str | None
    """Date the goods are needed by (YYYY-MM-DD)."""

    allow_alternatives: bool
    intent: InterpretedIntentDto | None
    forecast: ForecastRunDto | None
    market: list[MarketReferenceDto]
    candidates: list[CandidateDto]
    proposals: list[PurchaseOrderDto]
    active_proposal_id: str | None
    """Id of the related active proposal."""

    recommendation: RecommendationDto | None
    security_findings: list[SecurityFindingDto]
    agent_steps: list[AgentStepDto]
    created_by: str
    created_at: str
    """When created happened (ISO 8601, UTC)."""

    updated_at: str
    """When updated happened (ISO 8601, UTC)."""


class ProcurementRequestDtoDict(TypedDict):
    id: str
    status: RequestStatusOrStr
    instruction: str
    currency: str
    budget_limit_minor: int | None
    required_by: str | None
    allow_alternatives: bool
    intent: InterpretedIntentDtoDict | None
    forecast: ForecastRunDtoDict | None
    market: list[MarketReferenceDtoDict]
    candidates: list[CandidateDtoDict]
    proposals: list[PurchaseOrderDtoDict]
    active_proposal_id: str | None
    recommendation: RecommendationDtoDict | None
    security_findings: list[SecurityFindingDtoDict]
    agent_steps: list[AgentStepDtoDict]
    created_by: str
    created_at: str
    updated_at: str
