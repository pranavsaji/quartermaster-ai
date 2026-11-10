from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.policy_decision_kind import PolicyDecisionKindOrStr


class DecisionsByKind(SdkBaseModel):
    decision: PolicyDecisionKindOrStr
    """TrustRail's verdict on a cart."""

    count: int


class DecisionsByKindDict(TypedDict):
    decision: PolicyDecisionKindOrStr
    count: int
