from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.role import RoleOrStr


class MemberDto(SdkBaseModel):
    """A member of the workspace."""

    user_id: str
    """Id of the related user."""

    email: str
    """Email address."""

    name: str
    """Display name."""

    role: RoleOrStr
    """Workspace role: owners approve and pay, managers request, viewers read."""

    joined_at: str
    """When joined happened (ISO 8601, UTC)."""

    is_self: bool
    """True for the signed-in user."""


class MemberDtoDict(TypedDict):
    user_id: str
    email: str
    name: str
    role: RoleOrStr
    joined_at: str
    is_self: bool
