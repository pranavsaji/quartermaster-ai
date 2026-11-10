from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .member_dto import MemberDto, MemberDtoDict


class MembersRoleResponse(SdkBaseModel):
    member: MemberDto
    """A member of the workspace."""


class MembersRoleResponseDict(TypedDict):
    member: MemberDtoDict
