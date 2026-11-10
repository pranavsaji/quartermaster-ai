from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .budget_dto import BudgetDto, BudgetDtoDict
from .spend_mandate_dto import SpendMandateDto, SpendMandateDtoDict


class MandateUpdateResponse(SdkBaseModel):
    """``PUT /mandates/current``."""

    mandate: SpendMandateDto
    """The owner's Spend Mandate: what the business permits across purchases."""

    budget: BudgetDto
    """The current weekly budget: limit, reserved and spent amounts."""

    revoked_certificates: int
    """Active intent certificates revoked because they were signed under the previous version."""


class MandateUpdateResponseDict(TypedDict):
    mandate: SpendMandateDtoDict
    budget: BudgetDtoDict
    revoked_certificates: int
