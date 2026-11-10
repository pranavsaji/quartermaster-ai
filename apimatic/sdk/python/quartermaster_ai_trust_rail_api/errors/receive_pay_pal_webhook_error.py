from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

ReceivePayPalWebhookErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _ReceivePayPalWebhookError:
    def map(self, status_code: int, content: bytes) -> ReceivePayPalWebhookErrorBody:
        match status_code:
            case 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


receive_pay_pal_webhook_error_mapper: Final[ErrorMapper[ReceivePayPalWebhookErrorBody]] = _ReceivePayPalWebhookError()
