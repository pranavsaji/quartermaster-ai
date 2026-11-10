from __future__ import annotations

from uuid import UUID

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class RejectRequest(SdkBaseModel):
    """Reject one proposal, or every open proposal on the request."""

    reason: str
    """Reason given by the person making the change."""

    purchase_order_id: Optional[UUID] = UNSET
    """Id of the related purchase order."""


class RejectRequestDict(TypedDict):
    reason: str
    purchase_order_id: NotRequired[UUID]
