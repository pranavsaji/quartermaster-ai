from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.status2 import Status2OrStr


class AgentStepDto(SdkBaseModel):
    """One step of the procurement agent's research run (tool, input summary, outcome)."""

    id: str
    """Unique identifier (UUID)."""

    tool: str
    status: Status2OrStr
    """Current status."""

    duration_ms: float
    """Duration, in milliseconds."""

    summary: str
    started_at: str
    """When started happened (ISO 8601, UTC)."""


class AgentStepDtoDict(TypedDict):
    id: str
    tool: str
    status: Status2OrStr
    duration_ms: float
    summary: str
    started_at: str
