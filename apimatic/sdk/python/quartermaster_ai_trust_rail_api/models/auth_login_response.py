from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .session_user import SessionUser, SessionUserDict


class AuthLoginResponse(SdkBaseModel):
    user: SessionUser
    """The signed-in user and their workspace."""


class AuthLoginResponseDict(TypedDict):
    user: SessionUserDict
