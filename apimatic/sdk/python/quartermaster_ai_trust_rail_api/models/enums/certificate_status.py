from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class CertificateStatus(str, Enum):
    """Lifecycle of an Intent Certificate."""

    ACTIVE = "ACTIVE"
    CONSUMED = "CONSUMED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"

    __str__ = str.__str__


CertificateStatusOrStr: TypeAlias = Annotated[CertificateStatus | str, open_enum_validator(CertificateStatus)]
