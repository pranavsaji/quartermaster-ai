from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .session_user import SessionUser, SessionUserDict


class AuthSignupResponse(SdkBaseModel):
    user: SessionUser
    """The signed-in user and their workspace."""


class AuthSignupResponseDict(TypedDict):
    user: SessionUserDict
