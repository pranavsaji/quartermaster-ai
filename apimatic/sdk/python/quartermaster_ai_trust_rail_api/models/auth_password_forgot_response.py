from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class AuthPasswordForgotResponse(SdkBaseModel):
    status: Literal["sent"] = "sent"


class AuthPasswordForgotResponseDict(TypedDict):
    status: Literal["sent"]
