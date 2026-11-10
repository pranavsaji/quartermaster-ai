from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.provider import ProviderOrStr


class Email(SdkBaseModel):
    """Email address."""

    enabled: bool
    """Whether the feature is turned on."""

    provider: ProviderOrStr
    """Provider in use."""


class EmailDict(TypedDict):
    enabled: bool
    provider: ProviderOrStr
