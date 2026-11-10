from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ResetLinkResponse(SdkBaseModel):
    """``POST /members/:id/password-reset`` (managers and viewers only). When the link was emailed to the member,
    ``reset_url`` is null; otherwise it is the one-time link for the owner to pass on."""

    reset_url: str | None
    """One-time password reset link, or null when it was emailed to the member."""

    expires_at: str
    """When expires happened (ISO 8601, UTC)."""

    email_sent: bool
    """Whether the link was emailed."""


class ResetLinkResponseDict(TypedDict):
    reset_url: str | None
    expires_at: str
    email_sent: bool
