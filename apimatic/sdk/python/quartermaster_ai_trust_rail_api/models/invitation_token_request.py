from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class InvitationTokenRequest(SdkBaseModel):
    """An invitation link token."""

    token: str
    """One-time link token from an invitation or reset email."""


class InvitationTokenRequestDict(TypedDict):
    token: str
