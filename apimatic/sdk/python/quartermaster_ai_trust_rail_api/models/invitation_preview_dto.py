from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.role import RoleOrStr


class InvitationPreviewDto(SdkBaseModel):
    """What someone opening an invitation link sees before accepting."""

    organization_name: str
    """Workspace (restaurant) name."""

    email: str
    """Email address."""

    role: RoleOrStr
    """Workspace role: owners approve and pay, managers request, viewers read."""

    invited_by_name: str | None
    """Name of the owner who sent the invitation."""

    expires_at: str
    """When expires happened (ISO 8601, UTC)."""


class InvitationPreviewDtoDict(TypedDict):
    organization_name: str
    email: str
    role: RoleOrStr
    invited_by_name: str | None
    expires_at: str
