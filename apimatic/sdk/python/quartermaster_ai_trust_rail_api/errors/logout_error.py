from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

LogoutErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _LogoutError:
    def map(self, status_code: int, content: bytes) -> LogoutErrorBody:
        match status_code:
            case 401 | 403 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


logout_error_mapper: Final[ErrorMapper[LogoutErrorBody]] = _LogoutError()
