from __future__ import annotations

from pydantic import EmailStr
from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ForgotPasswordRequest(SdkBaseModel):
    """Request a password reset email."""

    email: EmailStr
    """Email address."""


class ForgotPasswordRequestDict(TypedDict):
    email: EmailStr
