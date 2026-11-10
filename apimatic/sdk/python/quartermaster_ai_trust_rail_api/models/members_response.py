from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .invitation_dto import InvitationDto, InvitationDtoDict
from .member_dto import MemberDto, MemberDtoDict


class MembersResponse(SdkBaseModel):
    """``GET /members``. Invitations are listed for owners only (empty otherwise)."""

    members: list[MemberDto]
    invitations: list[InvitationDto]


class MembersResponseDict(TypedDict):
    members: list[MemberDtoDict]
    invitations: list[InvitationDtoDict]
