from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

GetPlatformHealthErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _GetPlatformHealthError:
    def map(self, status_code: int, content: bytes) -> GetPlatformHealthErrorBody:
        match status_code:
            case 400 | 401 | 403 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


get_platform_health_error_mapper: Final[ErrorMapper[GetPlatformHealthErrorBody]] = _GetPlatformHealthError()
