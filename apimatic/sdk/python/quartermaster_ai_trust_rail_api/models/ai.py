from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.ai_mode import AiModeOrStr


class Ai(SdkBaseModel):
    enabled: bool
    """Whether the feature is turned on."""

    mode: AiModeOrStr
    """Whether the language model or the deterministic fallback interpreted a request."""


class AiDict(TypedDict):
    enabled: bool
    mode: AiModeOrStr
