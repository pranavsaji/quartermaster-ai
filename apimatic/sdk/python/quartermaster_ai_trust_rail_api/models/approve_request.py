from __future__ import annotations

from uuid import UUID

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ApproveRequest(SdkBaseModel):
    """The owner's approval of one exact proposal, bound to the cart hash they saw."""

    purchase_order_id: UUID
    """Id of the related purchase order."""

    cart_hash: str
    """SHA-256 of the canonical cart, bound into the Intent Certificate."""

    acknowledged_review_codes: Optional[list[str]] = UNSET
    note: Optional[str] = UNSET
    """Optional note."""


class ApproveRequestDict(TypedDict):
    purchase_order_id: UUID
    cart_hash: str
    acknowledged_review_codes: NotRequired[list[str]]
    note: NotRequired[str]
