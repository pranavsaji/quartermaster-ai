from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class PolicyCheckDto(SdkBaseModel):
    """One TrustRail policy check and its result."""

    code: str
    """Stable machine-readable code."""

    passed: bool
    detail: str


class PolicyCheckDtoDict(TypedDict):
    code: str
    passed: bool
    detail: str
