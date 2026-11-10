from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .procurement_request_summary_dto import ProcurementRequestSummaryDto, ProcurementRequestSummaryDtoDict


class ProcurementRequestsResponse(SdkBaseModel):
    items: list[ProcurementRequestSummaryDto]
    next_cursor: str | None
    """Pass as ``cursor`` for the next page; null on the last page."""


class ProcurementRequestsResponseDict(TypedDict):
    items: list[ProcurementRequestSummaryDtoDict]
    next_cursor: str | None
