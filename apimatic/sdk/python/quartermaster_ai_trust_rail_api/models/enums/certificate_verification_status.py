from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class CertificateVerificationStatus(str, Enum):
    """Outcome of a certificate verification."""

    VALID = "VALID"
    EXPIRED = "EXPIRED"
    CART_MODIFIED = "CART_MODIFIED"
    SIGNATURE_INVALID = "SIGNATURE_INVALID"
    UNKNOWN_KEY = "UNKNOWN_KEY"
    MANDATE_CHANGED = "MANDATE_CHANGED"
    REVOKED = "REVOKED"
    CONSUMED = "CONSUMED"
    PAYLOAD_MISMATCH = "PAYLOAD_MISMATCH"

    __str__ = str.__str__


CertificateVerificationStatusOrStr: TypeAlias = Annotated[
    CertificateVerificationStatus | str, open_enum_validator(CertificateVerificationStatus)
]
