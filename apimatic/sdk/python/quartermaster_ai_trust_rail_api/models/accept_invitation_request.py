from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class AcceptInvitationRequest(SdkBaseModel):
    """Accept an invitation: the invitee's name and new password, with the link token."""

    token: str
    """One-time link token from an invitation or reset email."""

    name: str
    """Display name."""

    password: str
    """Password (never returned by the API)."""


class AcceptInvitationRequestDict(TypedDict):
    token: str
    name: str
    password: str
