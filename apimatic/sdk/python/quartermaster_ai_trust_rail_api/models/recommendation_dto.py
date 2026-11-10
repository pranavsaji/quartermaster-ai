from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.ai_mode import AiModeOrStr


class RecommendationDto(SdkBaseModel):
    """The agent's recommended proposal and its explanation."""

    summary: str
    rationale: list[str]
    ai_mode: AiModeOrStr
    """Whether the language model or the deterministic fallback interpreted a request."""


class RecommendationDtoDict(TypedDict):
    summary: str
    rationale: list[str]
    ai_mode: AiModeOrStr
