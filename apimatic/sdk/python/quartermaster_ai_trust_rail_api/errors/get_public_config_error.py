from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

GetPublicConfigErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _GetPublicConfigError:
    def map(self, status_code: int, content: bytes) -> GetPublicConfigErrorBody:
        match status_code:
            case 400 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


get_public_config_error_mapper: Final[ErrorMapper[GetPublicConfigErrorBody]] = _GetPublicConfigError()
