from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .security_finding_dto import SecurityFindingDto, SecurityFindingDtoDict


class SecurityEventsResponse(SdkBaseModel):
    items: list[SecurityFindingDto]
    next_cursor: str | None
    """Pass as ``cursor`` for the next page; null on the last page."""


class SecurityEventsResponseDict(TypedDict):
    items: list[SecurityFindingDtoDict]
    next_cursor: str | None
