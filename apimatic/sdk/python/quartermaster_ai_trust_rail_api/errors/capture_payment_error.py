from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

CapturePaymentErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _CapturePaymentError:
    def map(self, status_code: int, content: bytes) -> CapturePaymentErrorBody:
        match status_code:
            case 400 | 401 | 403 | 404 | 409 | 422 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


capture_payment_error_mapper: Final[ErrorMapper[CapturePaymentErrorBody]] = _CapturePaymentError()
