from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

VerifyIntentCertificateErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _VerifyIntentCertificateError:
    def map(self, status_code: int, content: bytes) -> VerifyIntentCertificateErrorBody:
        match status_code:
            case 400 | 401 | 403 | 404 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


verify_intent_certificate_error_mapper: Final[
    ErrorMapper[VerifyIntentCertificateErrorBody]
] = _VerifyIntentCertificateError()
