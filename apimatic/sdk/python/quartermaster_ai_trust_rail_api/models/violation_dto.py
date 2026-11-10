from __future__ import annotations

from typing import Any

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.severity2 import Severity2OrStr
from .enums.violation_code import ViolationCodeOrStr


class ViolationDto(SdkBaseModel):
    """A policy violation with its severity and explanation."""

    code: ViolationCodeOrStr
    """Machine-readable TrustRail policy violation."""

    severity: Severity2OrStr
    """Severity."""

    message: str
    """Human-readable message (fixed per code)."""

    evidence: Optional[Any] = UNSET


class ViolationDtoDict(TypedDict):
    code: ViolationCodeOrStr
    severity: Severity2OrStr
    message: str
    evidence: NotRequired[Any]
