from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .delivery_dto import DeliveryDto, DeliveryDtoDict
from .enums.purchase_order_status import PurchaseOrderStatusOrStr
from .intent_certificate_dto import IntentCertificateDto, IntentCertificateDtoDict
from .payment_dto import PaymentDto, PaymentDtoDict
from .policy_decision_dto import PolicyDecisionDto, PolicyDecisionDtoDict
from .purchase_order_item_dto import PurchaseOrderItemDto, PurchaseOrderItemDtoDict


class PurchaseOrderDto(SdkBaseModel):
    """A proposed or committed purchase order (immutable once proposed)."""

    id: str
    """Unique identifier (UUID)."""

    number: str
    request_id: str | None
    """Id of the related request."""

    supplier_id: str
    """Id of the related supplier."""

    supplier_name: str
    status: PurchaseOrderStatusOrStr
    """Purchase order lifecycle."""

    currency: str
    """ISO 4217 currency code."""

    subtotal_minor: int
    """Subtotal, in minor units (cents)."""

    shipping_minor: int
    """Shipping, in minor units (cents)."""

    tax_minor: int
    """Tax, in minor units (cents)."""

    fees_minor: int
    """Fees, in minor units (cents)."""

    total_minor: int
    """Total, in minor units (cents)."""

    cart_hash: str
    """SHA-256 of the canonical cart, bound into the Intent Certificate."""

    items: list[PurchaseOrderItemDto]
    """The items in this response."""

    policy_decision: PolicyDecisionDto | None
    certificate: IntentCertificateDto | None
    """Intent Certificate."""

    payment: PaymentDto | None
    """Payment attempt."""

    delivery: DeliveryDto | None
    """Delivery."""

    created_at: str
    """When created happened (ISO 8601, UTC)."""


class PurchaseOrderDtoDict(TypedDict):
    id: str
    number: str
    request_id: str | None
    supplier_id: str
    supplier_name: str
    status: PurchaseOrderStatusOrStr
    currency: str
    subtotal_minor: int
    shipping_minor: int
    tax_minor: int
    fees_minor: int
    total_minor: int
    cart_hash: str
    items: list[PurchaseOrderItemDtoDict]
    policy_decision: PolicyDecisionDtoDict | None
    certificate: IntentCertificateDtoDict | None
    payment: PaymentDtoDict | None
    delivery: DeliveryDtoDict | None
    created_at: str
