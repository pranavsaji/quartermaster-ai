from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.certificate_verification_status import CertificateVerificationStatusOrStr
from .intent_certificate_dto import IntentCertificateDto, IntentCertificateDtoDict
from .policy_check_dto import PolicyCheckDto, PolicyCheckDtoDict


class CertificateVerificationDto(SdkBaseModel):
    """Result of verifying an Intent Certificate's signature and bindings."""

    intent_id: str
    """Id of the related intent."""

    status: CertificateVerificationStatusOrStr
    """Outcome of a certificate verification."""

    valid: bool
    """Whether verification passed."""

    checks: list[PolicyCheckDto]
    certificate: IntentCertificateDto
    """The owner's signed approval of one exact cart (Ed25519)."""

    verified_at: str
    """When verified happened (ISO 8601, UTC)."""


class CertificateVerificationDtoDict(TypedDict):
    intent_id: str
    status: CertificateVerificationStatusOrStr
    valid: bool
    checks: list[PolicyCheckDtoDict]
    certificate: IntentCertificateDtoDict
    verified_at: str
