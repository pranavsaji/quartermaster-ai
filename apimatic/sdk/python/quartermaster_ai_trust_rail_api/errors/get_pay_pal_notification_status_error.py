from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

GetPayPalNotificationStatusErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _GetPayPalNotificationStatusError:
    def map(self, status_code: int, content: bytes) -> GetPayPalNotificationStatusErrorBody:
        match status_code:
            case 400 | 401 | 403 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


get_pay_pal_notification_status_error_mapper: Final[
    ErrorMapper[GetPayPalNotificationStatusErrorBody]
] = _GetPayPalNotificationStatusError()
