from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.role import RoleOrStr
from .organization import Organization, OrganizationDict


class SessionUser(SdkBaseModel):
    """The signed-in user and their workspace."""

    id: str
    """Unique identifier (UUID)."""

    email: str
    """Email address."""

    name: str
    """Display name."""

    role: RoleOrStr
    """Workspace role: owners approve and pay, managers request, viewers read."""

    organization: Organization
    """The user's workspace."""

    operator: bool
    """Platform operator (OPERATOR_EMAILS): may see system-wide error tracking."""


class SessionUserDict(TypedDict):
    id: str
    email: str
    name: str
    role: RoleOrStr
    organization: OrganizationDict
    operator: bool
