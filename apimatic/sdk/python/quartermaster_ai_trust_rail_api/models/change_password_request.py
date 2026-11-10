from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ChangePasswordRequest(SdkBaseModel):
    """Change the signed-in user's password."""

    current_password: str
    new_password: str


class ChangePasswordRequestDict(TypedDict):
    current_password: str
    new_password: str
