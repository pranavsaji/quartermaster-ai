from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class FindingType(str, Enum):
    """Kind of security finding."""

    PROMPT_INJECTION = "PROMPT_INJECTION"
    UNAUTHORIZED_FEE = "UNAUTHORIZED_FEE"
    POLICY_VIOLATION = "POLICY_VIOLATION"
    CART_TAMPERING = "CART_TAMPERING"
    DUPLICATE_INVOICE = "DUPLICATE_INVOICE"
    INVOICE_DISCREPANCY = "INVOICE_DISCREPANCY"
    WEBHOOK_SIGNATURE_INVALID = "WEBHOOK_SIGNATURE_INVALID"
    CERTIFICATE_VERIFICATION_FAILED = "CERTIFICATE_VERIFICATION_FAILED"
    PAYMENT_AMOUNT_MISMATCH = "PAYMENT_AMOUNT_MISMATCH"
    ACCESS_DENIED = "ACCESS_DENIED"
    PAYMENT_REVERSED = "PAYMENT_REVERSED"

    __str__ = str.__str__


FindingTypeOrStr: TypeAlias = Annotated[FindingType | str, open_enum_validator(FindingType)]
