from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .accounts import Accounts, AccountsDict
from .ai import Ai, AiDict
from .market_data import MarketData, MarketDataDict
from .paypal import Paypal, PaypalDict


class PublicConfig(SdkBaseModel):
    """Feature flags and integration status visible before sign-in."""

    environment: str
    """Deployment environment."""

    paypal: Paypal
    market_data: MarketData
    ai: Ai
    accounts: Accounts
    sample_accounts_hint: bool
    """Show the shared sample-workspace accounts on the sign-in page."""


class PublicConfigDict(TypedDict):
    environment: str
    paypal: PaypalDict
    market_data: MarketDataDict
    ai: AiDict
    accounts: AccountsDict
    sample_accounts_hint: bool
