from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .audit_event_dto import AuditEventDto, AuditEventDtoDict


class SecurityAuditResponse(SdkBaseModel):
    items: list[AuditEventDto]
    next_cursor: str | None
    """Pass as ``cursor`` for the next page; null on the last page."""


class SecurityAuditResponseDict(TypedDict):
    items: list[AuditEventDtoDict]
    next_cursor: str | None
