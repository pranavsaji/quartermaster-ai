from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class AuthPasswordResetResponse(SdkBaseModel):
    status: Literal["reset"] = "reset"


class AuthPasswordResetResponseDict(TypedDict):
    status: Literal["reset"]
