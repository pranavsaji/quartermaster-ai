from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class IntentCertificatePayload(SdkBaseModel):
    """The signed fields of an Intent Certificate."""

    certificate_version: Literal[1] = 1
    intent_id: str
    """Id of the related intent."""

    organization_id: str
    """Id of the related organization."""

    buyer_id: str
    """Id of the related buyer."""

    purchase_order_id: str
    """Id of the related purchase order."""

    supplier_id: str
    """Id of the related supplier."""

    cart_hash: str
    """SHA-256 of the canonical cart, bound into the Intent Certificate."""

    mandate_id: str
    """Id of the related mandate."""

    mandate_version: float
    policy_decision_id: str
    """Id of the related policy decision."""

    currency: str
    """ISO 4217 currency code."""

    approved_amount_minor: int
    """Approved amount, in minor units (cents)."""

    approved_at: str
    """When approved happened (ISO 8601, UTC)."""

    expires_at: str
    """When expires happened (ISO 8601, UTC)."""

    nonce: str
    key_id: str
    """Id of the related key."""


class IntentCertificatePayloadDict(TypedDict):
    certificate_version: Literal[1]
    intent_id: str
    organization_id: str
    buyer_id: str
    purchase_order_id: str
    supplier_id: str
    cart_hash: str
    mandate_id: str
    mandate_version: float
    policy_decision_id: str
    currency: str
    approved_amount_minor: int
    approved_at: str
    expires_at: str
    nonce: str
    key_id: str
