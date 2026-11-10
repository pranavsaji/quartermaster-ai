from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.invitation_status import InvitationStatusOrStr
from .enums.role import RoleOrStr


class InvitationDto(SdkBaseModel):
    """An invitation to the workspace."""

    id: str
    """Unique identifier (UUID)."""

    email: str
    """Email address."""

    role: RoleOrStr
    """Workspace role: owners approve and pay, managers request, viewers read."""

    status: InvitationStatusOrStr
    """Invitation lifecycle."""

    invited_by_name: str | None
    """Name of the owner who sent the invitation."""

    created_at: str
    """When created happened (ISO 8601, UTC)."""

    expires_at: str
    """When expires happened (ISO 8601, UTC)."""


class InvitationDtoDict(TypedDict):
    id: str
    email: str
    role: RoleOrStr
    status: InvitationStatusOrStr
    invited_by_name: str | None
    created_at: str
    expires_at: str
