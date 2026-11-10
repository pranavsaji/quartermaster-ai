from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .system_error_dto import SystemErrorDto, SystemErrorDtoDict


class OpsErrorsResponse(SdkBaseModel):
    items: list[SystemErrorDto]
    next_cursor: str | None
    """Pass as ``cursor`` for the next page; null on the last page."""


class OpsErrorsResponseDict(TypedDict):
    items: list[SystemErrorDtoDict]
    next_cursor: str | None
