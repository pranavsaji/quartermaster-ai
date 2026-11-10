from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .invitation_preview_dto import InvitationPreviewDto, InvitationPreviewDtoDict


class InvitationsLookupResponse(SdkBaseModel):
    invitation: InvitationPreviewDto
    """What someone opening an invitation link sees before accepting."""


class InvitationsLookupResponseDict(TypedDict):
    invitation: InvitationPreviewDtoDict
