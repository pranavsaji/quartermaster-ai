from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.environment_model import EnvironmentModelOrStr


class Paypal(SdkBaseModel):
    enabled: bool
    """Whether the feature is turned on."""

    client_id: str | None
    """Id of the related client."""

    sdk_url: str
    environment: EnvironmentModelOrStr
    """Deployment environment."""


class PaypalDict(TypedDict):
    enabled: bool
    client_id: str | None
    sdk_url: str
    environment: EnvironmentModelOrStr
