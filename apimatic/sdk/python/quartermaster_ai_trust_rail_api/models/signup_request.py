from __future__ import annotations

from pydantic import EmailStr
from typing_extensions import NotRequired, TypedDict

from ..core import SdkBaseModel


class SignupRequest(SdkBaseModel):
    """Create a workspace and its first owner."""

    name: str
    """Display name."""

    email: EmailStr
    """Email address."""

    password: str
    """Password (never returned by the API)."""

    organization_name: str
    """Workspace (restaurant) name."""

    timezone: str = "America/Los_Angeles"
    """IANA time zone of the workspace."""

    sample_data: bool = True
    """Start the workspace with labelled sample suppliers, stock and history."""


class SignupRequestDict(TypedDict):
    name: str
    email: EmailStr
    password: str
    organization_name: str
    timezone: NotRequired[str]
    sample_data: NotRequired[bool]
