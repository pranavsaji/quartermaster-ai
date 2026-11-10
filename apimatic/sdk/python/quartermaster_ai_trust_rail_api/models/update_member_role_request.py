from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.role1 import Role1OrStr


class UpdateMemberRoleRequest(SdkBaseModel):
    """A member's new role."""

    role: Role1OrStr
    """Workspace role."""


class UpdateMemberRoleRequestDict(TypedDict):
    role: Role1OrStr
