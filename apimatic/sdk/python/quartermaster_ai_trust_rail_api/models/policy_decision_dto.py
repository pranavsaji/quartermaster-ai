from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.policy_decision_kind import PolicyDecisionKindOrStr
from .policy_check_dto import PolicyCheckDto, PolicyCheckDtoDict
from .violation_dto import ViolationDto, ViolationDtoDict


class PolicyDecisionDto(SdkBaseModel):
    """A recorded TrustRail decision with its checks and violations."""

    id: str
    """Unique identifier (UUID)."""

    purchase_order_id: str
    """Id of the related purchase order."""

    decision: PolicyDecisionKindOrStr
    """TrustRail's verdict on a cart."""

    violations: list[ViolationDto]
    checks: list[PolicyCheckDto]
    human_approval_required: bool
    """An owner must approve every purchase (always true)."""

    mandate_version: float
    policy_version: str
    input_digest: str
    evaluated_at: str
    """When evaluated happened (ISO 8601, UTC)."""


class PolicyDecisionDtoDict(TypedDict):
    id: str
    purchase_order_id: str
    decision: PolicyDecisionKindOrStr
    violations: list[ViolationDtoDict]
    checks: list[PolicyCheckDtoDict]
    human_approval_required: bool
    mandate_version: float
    policy_version: str
    input_digest: str
    evaluated_at: str
