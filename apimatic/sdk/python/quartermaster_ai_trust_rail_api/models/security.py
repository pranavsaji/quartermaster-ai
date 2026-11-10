from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Security(SdkBaseModel):
    findings_total: int
    """Number of findings."""

    blocked_attempts: int
    prompt_injections_detected: int
    duplicate_invoices_flagged: int
    duplicate_captures: int


class SecurityDict(TypedDict):
    findings_total: int
    blocked_attempts: int
    prompt_injections_detected: int
    duplicate_invoices_flagged: int
    duplicate_captures: int
