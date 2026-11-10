from __future__ import annotations

from pydantic import EmailStr
from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.role1 import Role1OrStr


class CreateInvitationRequest(SdkBaseModel):
    """Invite an email address with a role."""

    email: EmailStr
    """Email address."""

    role: Role1OrStr
    """Workspace role."""


class CreateInvitationRequestDict(TypedDict):
    email: EmailStr
    role: Role1OrStr
