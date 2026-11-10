from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .error import Error, ErrorDict


class ApiErrorModel(SdkBaseModel):
    """Error envelope shared by every endpoint. ``code`` is stable; ``message`` is fixed per code."""

    error: Error


class ApiErrorModelDict(TypedDict):
    error: ErrorDict
