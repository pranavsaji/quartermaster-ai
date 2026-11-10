from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.level import LevelOrStr
from .enums.source import SourceOrStr


class SystemErrorDto(SdkBaseModel):
    """A tracked error group (operators only)."""

    id: str
    """Unique identifier (UUID)."""

    fingerprint: str
    """Grouping key for identical errors."""

    source: SourceOrStr
    """Where the error came from."""

    level: LevelOrStr
    """Severity level."""

    code: str
    """Stable machine-readable code."""

    message: str
    """Human-readable message (fixed per code)."""

    route: str | None
    """API route template or page path."""

    occurrences: int
    """How many times this error occurred."""

    first_seen_at: str
    """When first seen happened (ISO 8601, UTC)."""

    last_seen_at: str
    """When last seen happened (ISO 8601, UTC)."""

    last_correlation_id: str | None
    """Id of the related last correlation."""

    last_alerted_at: str | None
    """When last alerted happened (ISO 8601, UTC)."""

    resolved_at: str | None
    """When resolved happened (ISO 8601, UTC)."""


class SystemErrorDtoDict(TypedDict):
    id: str
    fingerprint: str
    source: SourceOrStr
    level: LevelOrStr
    code: str
    message: str
    route: str | None
    occurrences: int
    first_seen_at: str
    last_seen_at: str
    last_correlation_id: str | None
    last_alerted_at: str | None
    resolved_at: str | None
