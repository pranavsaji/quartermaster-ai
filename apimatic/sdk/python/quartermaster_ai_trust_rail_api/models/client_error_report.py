from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.kind import KindOrStr


class ClientErrorReport(SdkBaseModel):
    """A browser error reported for error tracking."""

    message: str
    """Human-readable message (fixed per code)."""

    digest: Optional[str] = UNSET
    """Next.js error digest."""

    path: str
    """Page path."""

    stack: Optional[str] = UNSET
    """Trimmed stack trace."""

    kind: KindOrStr
    """Kind of entry."""


class ClientErrorReportDict(TypedDict):
    message: str
    digest: NotRequired[str]
    path: str
    stack: NotRequired[str]
    kind: KindOrStr
