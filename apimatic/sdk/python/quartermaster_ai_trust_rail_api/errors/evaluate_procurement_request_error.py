from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

EvaluateProcurementRequestErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _EvaluateProcurementRequestError:
    def map(self, status_code: int, content: bytes) -> EvaluateProcurementRequestErrorBody:
        match status_code:
            case 401 | 403 | 404 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


evaluate_procurement_request_error_mapper: Final[
    ErrorMapper[EvaluateProcurementRequestErrorBody]
] = _EvaluateProcurementRequestError()
