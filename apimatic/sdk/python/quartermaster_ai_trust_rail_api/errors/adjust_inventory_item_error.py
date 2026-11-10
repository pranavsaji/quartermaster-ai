from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

AdjustInventoryItemErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _AdjustInventoryItemError:
    def map(self, status_code: int, content: bytes) -> AdjustInventoryItemErrorBody:
        match status_code:
            case 400 | 401 | 403 | 404 | 409 | 422 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


adjust_inventory_item_error_mapper: Final[ErrorMapper[AdjustInventoryItemErrorBody]] = _AdjustInventoryItemError()
