from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .intent_certificate_dto import IntentCertificateDto, IntentCertificateDtoDict
from .purchase_order_dto import PurchaseOrderDto, PurchaseOrderDtoDict


class ProcurementRequestsApproveResponse(SdkBaseModel):
    purchase_order: PurchaseOrderDto
    """A proposed or committed purchase order (immutable once proposed)."""

    certificate: IntentCertificateDto
    """The owner's signed approval of one exact cart (Ed25519)."""


class ProcurementRequestsApproveResponseDict(TypedDict):
    purchase_order: PurchaseOrderDtoDict
    certificate: IntentCertificateDtoDict
