from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class AuthPasswordChangeResponse(SdkBaseModel):
    status: Literal["changed"] = "changed"


class AuthPasswordChangeResponseDict(TypedDict):
    status: Literal["changed"]
