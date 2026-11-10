from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

LoginErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _LoginError:
    def map(self, status_code: int, content: bytes) -> LoginErrorBody:
        match status_code:
            case 400 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


login_error_mapper: Final[ErrorMapper[LoginErrorBody]] = _LoginError()
