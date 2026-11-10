from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

UpdateCatalogItemErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _UpdateCatalogItemError:
    def map(self, status_code: int, content: bytes) -> UpdateCatalogItemErrorBody:
        match status_code:
            case 400 | 401 | 403 | 404 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


update_catalog_item_error_mapper: Final[ErrorMapper[UpdateCatalogItemErrorBody]] = _UpdateCatalogItemError()
