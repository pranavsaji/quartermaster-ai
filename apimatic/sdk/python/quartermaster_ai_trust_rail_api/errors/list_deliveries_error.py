from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

ListDeliveriesErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _ListDeliveriesError:
    def map(self, status_code: int, content: bytes) -> ListDeliveriesErrorBody:
        match status_code:
            case 400 | 401 | 403 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


list_deliveries_error_mapper: Final[ErrorMapper[ListDeliveriesErrorBody]] = _ListDeliveriesError()
