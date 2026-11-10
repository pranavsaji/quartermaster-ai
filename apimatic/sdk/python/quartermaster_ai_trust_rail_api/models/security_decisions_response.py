from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .policy_decision_dto import PolicyDecisionDto, PolicyDecisionDtoDict


class SecurityDecisionsResponse(SdkBaseModel):
    items: list[PolicyDecisionDto]
    next_cursor: str | None
    """Pass as ``cursor`` for the next page; null on the last page."""


class SecurityDecisionsResponseDict(TypedDict):
    items: list[PolicyDecisionDtoDict]
    next_cursor: str | None
