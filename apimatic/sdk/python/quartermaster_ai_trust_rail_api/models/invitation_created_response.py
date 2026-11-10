from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .invitation_dto import InvitationDto, InvitationDtoDict


class InvitationCreatedResponse(SdkBaseModel):
    """``POST /members/invitations``. The link is returned to the owner so it can be shared even when no email provider
    is configured; it is never retrievable again."""

    invitation: InvitationDto
    """An invitation to the workspace."""

    invite_url: str
    """One-time invitation link (token in the URL fragment). Shown once."""

    email_sent: bool
    """Whether the link was emailed."""


class InvitationCreatedResponseDict(TypedDict):
    invitation: InvitationDtoDict
    invite_url: str
    email_sent: bool
