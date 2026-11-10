from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

RequestPasswordResetErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _RequestPasswordResetError:
    def map(self, status_code: int, content: bytes) -> RequestPasswordResetErrorBody:
        match status_code:
            case 400 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


request_password_reset_error_mapper: Final[ErrorMapper[RequestPasswordResetErrorBody]] = _RequestPasswordResetError()
