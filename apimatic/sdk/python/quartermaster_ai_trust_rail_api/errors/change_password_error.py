from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

ChangePasswordErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _ChangePasswordError:
    def map(self, status_code: int, content: bytes) -> ChangePasswordErrorBody:
        match status_code:
            case 400 | 401 | 403 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


change_password_error_mapper: Final[ErrorMapper[ChangePasswordErrorBody]] = _ChangePasswordError()
