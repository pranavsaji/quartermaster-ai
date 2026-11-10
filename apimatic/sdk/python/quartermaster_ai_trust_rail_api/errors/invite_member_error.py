from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypeAlias

from ..core import ErrorMapper, RawError, decode_json
from ..models.api_error_model import ApiErrorModel

InviteMemberErrorBody: TypeAlias = ApiErrorModel | RawError


@dataclass(frozen=True, slots=True)
class _InviteMemberError:
    def map(self, status_code: int, content: bytes) -> InviteMemberErrorBody:
        match status_code:
            case 400 | 401 | 403 | 409 | 429:
                return decode_json[ApiErrorModel](content)
            case _:
                return RawError(status_code, content)


invite_member_error_mapper: Final[ErrorMapper[InviteMemberErrorBody]] = _InviteMemberError()
