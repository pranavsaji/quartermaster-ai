from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .alerting import Alerting, AlertingDict
from .email import Email, EmailDict
from .error_tracking import ErrorTracking, ErrorTrackingDict
from .payments import Payments, PaymentsDict
from .paypal_webhooks import PaypalWebhooks, PaypalWebhooksDict


class OpsHealthDto(SdkBaseModel):
    """Platform health for operators: error tracking, alerting, email, webhooks, payments."""

    error_tracking: ErrorTracking
    alerting: Alerting
    email: Email
    """Email address."""

    paypal_webhooks: PaypalWebhooks
    payments: Payments


class OpsHealthDtoDict(TypedDict):
    error_tracking: ErrorTrackingDict
    alerting: AlertingDict
    email: EmailDict
    paypal_webhooks: PaypalWebhooksDict
    payments: PaymentsDict
