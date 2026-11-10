from __future__ import annotations

from typing import Any

from pydantic import Field
from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.finding_type import FindingTypeOrStr
from .enums.severity import SeverityOrStr


class SecurityFindingDto(SdkBaseModel):
    """A security finding (prompt injection, unauthorised fee, duplicate, signature failure...)."""

    id: str
    """Unique identifier (UUID)."""

    type_: FindingTypeOrStr = Field(alias="type")
    """Kind of security finding."""

    severity: SeverityOrStr
    """Finding severity."""

    title: str
    """Short title."""

    description: str
    """Free-text description."""

    source_kind: str
    source_id: str | None
    """Id of the related source."""

    evidence: Any
    related_purchase_order_id: str | None
    """Id of the related related purchase order."""

    related_request_id: str | None
    """Id of the related related request."""

    created_at: str
    """When created happened (ISO 8601, UTC)."""


class SecurityFindingDtoDict(TypedDict):
    id: str
    type_: FindingTypeOrStr
    severity: SeverityOrStr
    title: str
    description: str
    source_kind: str
    source_id: str | None
    evidence: Any
    related_purchase_order_id: str | None
    related_request_id: str | None
    created_at: str
