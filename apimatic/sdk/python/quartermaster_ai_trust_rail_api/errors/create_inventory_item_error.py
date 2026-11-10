from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

CreateInventoryItemErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _CreateInventoryItemError:
    def map(self, status_code: int, content: bytes) -> CreateInventoryItemErrorBody:
        match status_code:
            case 400 | 401 | 403 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


create_inventory_item_error_mapper: Final[ErrorMapper[CreateInventoryItemErrorBody]] = _CreateInventoryItemError()
