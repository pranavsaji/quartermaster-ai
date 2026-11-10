from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class ActorType(str, Enum):
    USER = "USER"
    SYSTEM = "SYSTEM"
    AGENT = "AGENT"
    PAYPAL = "PAYPAL"

    __str__ = str.__str__


ActorTypeOrStr: TypeAlias = Annotated[ActorType | str, open_enum_validator(ActorType)]
