from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .invitation_dto import InvitationDto, InvitationDtoDict


class MembersInvitationsRevokeResponse(SdkBaseModel):
    invitation: InvitationDto
    """An invitation to the workspace."""


class MembersInvitationsRevokeResponseDict(TypedDict):
    invitation: InvitationDtoDict
