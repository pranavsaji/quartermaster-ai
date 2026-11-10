from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class AuditChainVerificationDto(SdkBaseModel):
    """Result of re-verifying the hash-chained audit log."""

    valid: bool
    """Whether verification passed."""

    events_checked: int
    first_invalid_sequence: float | None


class AuditChainVerificationDtoDict(TypedDict):
    valid: bool
    events_checked: int
    first_invalid_sequence: float | None
