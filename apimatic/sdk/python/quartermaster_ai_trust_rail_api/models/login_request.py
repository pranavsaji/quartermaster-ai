from __future__ import annotations

from pydantic import EmailStr
from typing_extensions import TypedDict

from ..core import SdkBaseModel


class LoginRequest(SdkBaseModel):
    """Email and password sign-in."""

    email: EmailStr
    """Email address."""

    password: str
    """Password (never returned by the API)."""


class LoginRequestDict(TypedDict):
    email: EmailStr
    password: str
