from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

GetSpendMandateErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _GetSpendMandateError:
    def map(self, status_code: int, content: bytes) -> GetSpendMandateErrorBody:
        match status_code:
            case 400 | 401 | 403 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


get_spend_mandate_error_mapper: Final[ErrorMapper[GetSpendMandateErrorBody]] = _GetSpendMandateError()
