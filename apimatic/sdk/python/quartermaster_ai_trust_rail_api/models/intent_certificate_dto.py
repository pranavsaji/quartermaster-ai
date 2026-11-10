from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.certificate_status import CertificateStatusOrStr
from .intent_certificate_payload import IntentCertificatePayload, IntentCertificatePayloadDict


class IntentCertificateDto(SdkBaseModel):
    """The owner's signed approval of one exact cart (Ed25519)."""

    id: str
    """Unique identifier (UUID)."""

    status: CertificateStatusOrStr
    """Lifecycle of an Intent Certificate."""

    payload: IntentCertificatePayload
    """The signed fields of an Intent Certificate."""

    key_id: str
    """Id of the related key."""

    signature: str
    algorithm: Literal["Ed25519"] = "Ed25519"
    issued_at: str
    """When issued happened (ISO 8601, UTC)."""

    expires_at: str
    """When expires happened (ISO 8601, UTC)."""


class IntentCertificateDtoDict(TypedDict):
    id: str
    status: CertificateStatusOrStr
    payload: IntentCertificatePayloadDict
    key_id: str
    signature: str
    algorithm: Literal["Ed25519"]
    issued_at: str
    expires_at: str
