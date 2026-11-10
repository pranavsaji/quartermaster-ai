from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Accounts(SdkBaseModel):
    signup_enabled: bool
    """Anyone may create a workspace."""

    email_enabled: bool
    """Outbound email is configured: invitations and reset links are emailed."""


class AccountsDict(TypedDict):
    signup_enabled: bool
    email_enabled: bool
