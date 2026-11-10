from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .pay_pal_notification_status_dto import PayPalNotificationStatusDto, PayPalNotificationStatusDtoDict


class SecurityPaypalNotificationsResponse(SdkBaseModel):
    status: PayPalNotificationStatusDto
    """Whether PayPal's signed notifications (webhooks) are reaching this deployment for an organisation."""


class SecurityPaypalNotificationsResponseDict(TypedDict):
    status: PayPalNotificationStatusDtoDict
