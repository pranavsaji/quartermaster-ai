from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ClientErrorsResponse(SdkBaseModel):
    status: Literal["recorded"] = "recorded"


class ClientErrorsResponseDict(TypedDict):
    status: Literal["recorded"]
