from __future__ import annotations

from typing import Any

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class Error(SdkBaseModel):
    code: str
    """Stable machine-readable code."""

    message: str
    """Human-readable message (fixed per code)."""

    details: Optional[Any] = UNSET
    correlation_id: Optional[str] = UNSET
    """Request correlation id; quote it to support to find the server logs."""


class ErrorDict(TypedDict):
    code: str
    message: str
    details: NotRequired[Any]
    correlation_id: NotRequired[str]
