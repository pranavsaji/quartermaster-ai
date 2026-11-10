from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ResetPasswordRequest(SdkBaseModel):
    """Set a new password from a one-time reset link."""

    token: str
    """One-time link token from an invitation or reset email."""

    password: str
    """Password (never returned by the API)."""


class ResetPasswordRequestDict(TypedDict):
    token: str
    password: str
