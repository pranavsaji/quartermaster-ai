from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

ResolveTrackedErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _ResolveTrackedError:
    def map(self, status_code: int, content: bytes) -> ResolveTrackedErrorBody:
        match status_code:
            case 401 | 403 | 404 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


resolve_tracked_error_mapper: Final[ErrorMapper[ResolveTrackedErrorBody]] = _ResolveTrackedError()
