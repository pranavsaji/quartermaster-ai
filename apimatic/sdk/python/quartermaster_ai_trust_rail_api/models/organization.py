from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Organization(SdkBaseModel):
    """The user's workspace."""

    id: str
    """Unique identifier (UUID)."""

    name: str
    """Display name."""

    timezone: str
    """IANA time zone of the workspace."""

    currency: str
    """ISO 4217 currency code."""


class OrganizationDict(TypedDict):
    id: str
    name: str
    timezone: str
    currency: str
