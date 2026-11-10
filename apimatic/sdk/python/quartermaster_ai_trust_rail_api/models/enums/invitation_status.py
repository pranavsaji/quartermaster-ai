from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class InvitationStatus(str, Enum):
    """Invitation lifecycle."""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"

    __str__ = str.__str__


InvitationStatusOrStr: TypeAlias = Annotated[InvitationStatus | str, open_enum_validator(InvitationStatus)]
