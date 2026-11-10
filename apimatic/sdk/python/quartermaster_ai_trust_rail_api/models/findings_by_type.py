from __future__ import annotations

from pydantic import Field
from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.finding_type import FindingTypeOrStr


class FindingsByType(SdkBaseModel):
    type_: FindingTypeOrStr = Field(alias="type")
    """Kind of security finding."""

    count: int


class FindingsByTypeDict(TypedDict):
    type_: FindingTypeOrStr
    count: int
