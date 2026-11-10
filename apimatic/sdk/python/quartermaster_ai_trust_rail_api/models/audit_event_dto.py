from __future__ import annotations

from typing import Any

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.actor_type import ActorTypeOrStr


class AuditEventDto(SdkBaseModel):
    """A tamper-evident audit log entry; each hash covers the previous one."""

    id: str
    """Unique identifier (UUID)."""

    sequence: int
    """Position in the workspace's audit chain."""

    action: str
    actor_type: ActorTypeOrStr
    actor_id: str | None
    """Id of the related actor."""

    entity_type: str
    entity_id: str | None
    """Id of the related entity."""

    data: Any
    hash: str
    """SHA-256 hash of this audit event."""

    prev_hash: str | None
    """Hash of the previous audit event (null for the first)."""

    correlation_id: str | None
    """Request correlation id; quote it to support to find the server logs."""

    created_at: str
    """When created happened (ISO 8601, UTC)."""


class AuditEventDtoDict(TypedDict):
    id: str
    sequence: int
    action: str
    actor_type: ActorTypeOrStr
    actor_id: str | None
    entity_type: str
    entity_id: str | None
    data: Any
    hash: str
    prev_hash: str | None
    correlation_id: str | None
    created_at: str
