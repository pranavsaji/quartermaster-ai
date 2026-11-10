from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .system_error_dto import SystemErrorDto, SystemErrorDtoDict


class OpsErrorsResolveResponse(SdkBaseModel):
    error: SystemErrorDto
    """A tracked error group (operators only)."""


class OpsErrorsResolveResponseDict(TypedDict):
    error: SystemErrorDtoDict
