from __future__ import annotations

from functools import cached_property
from types import TracebackType

from typing_extensions import Self

from .apis.accounts_api import AccountsApi
from .apis.analytics import Analytics
from .apis.inventory_api import InventoryApi
from .apis.operations import Operations
from .apis.orders import Orders
from .apis.payments_api import PaymentsApi
from .apis.procurement import Procurement
from .apis.security_api import SecurityApi
from .apis.suppliers import Suppliers
from .apis.system import System
from .apis.team import Team
from .apis.trust_rail import TrustRail
from .auth import AuthSchemes
from .base_client import DEFAULT_TIMEOUT, BaseQuartermasterAiTrustRailApiClient
from .core import (
    OPERATING_SYSTEM,
    PYTHON_RUNTIME,
    ApiKeyCookieScheme,
    HttpClient,
    Httpx2Client,
    LoggingOptionsOrDict,
    RawClient,
    RetryOptionsOrDict,
    no_auth,
    param,
)
from .server.environment import Environment


class QuartermasterAiTrustRailApiClient(BaseQuartermasterAiTrustRailApiClient[RawClient]):
    def __init__(
        self,
        *,
        environment: Environment = "hosted",
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        retry_options: int | RetryOptionsOrDict | None = None,
        logging_options: LoggingOptionsOrDict | None = None,
        custom_http_client: HttpClient | None = None,
        session: str | None = None,
        secure_session: str | None = None,
    ) -> None:
        super().__init__(
            environment=environment,
            base_url=base_url,
            timeout=timeout,
            retry_options=retry_options,
            logging_options=logging_options,
        )
        self._raw_client = RawClient(
            http_client=custom_http_client if custom_http_client is not None else Httpx2Client(timeout=timeout),
            retry_options=self._retry_options,
            logging_options=self._logging_options,
            global_headers=[
                param[str]("User-Agent", "QuartermasterAiTrustRailApiClient/1.0.0 Python"),
                param[str]("X-APIMatic-Lang", "Python"),
                param[str]("X-APIMatic-Package-Version", "1.0.0"),
                param[str]("X-APIMatic-Gen-Version", "4.0.0"),
                param[str]("X-APIMatic-OS", OPERATING_SYSTEM),
                param[str]("X-APIMatic-Runtime", PYTHON_RUNTIME),
            ],
        )
        self._auth = AuthSchemes(
            session=ApiKeyCookieScheme("qm_session", session) if session is not None else no_auth,
            secure_session=(
                ApiKeyCookieScheme("__Host-qm_session", secure_session) if secure_session is not None else no_auth
            ),
        )

    @cached_property
    def accounts_api(self) -> AccountsApi:
        return AccountsApi(self._raw_client, self._server, self._auth)

    @cached_property
    def analytics(self) -> Analytics:
        return Analytics(self._raw_client, self._server, self._auth)

    @cached_property
    def inventory_api(self) -> InventoryApi:
        return InventoryApi(self._raw_client, self._server, self._auth)

    @cached_property
    def operations(self) -> Operations:
        return Operations(self._raw_client, self._server, self._auth)

    @cached_property
    def orders(self) -> Orders:
        return Orders(self._raw_client, self._server, self._auth)

    @cached_property
    def payments_api(self) -> PaymentsApi:
        return PaymentsApi(self._raw_client, self._server, self._auth)

    @cached_property
    def procurement(self) -> Procurement:
        return Procurement(self._raw_client, self._server, self._auth)

    @cached_property
    def security_api(self) -> SecurityApi:
        return SecurityApi(self._raw_client, self._server, self._auth)

    @cached_property
    def suppliers(self) -> Suppliers:
        return Suppliers(self._raw_client, self._server, self._auth)

    @cached_property
    def system(self) -> System:
        return System(self._raw_client, self._server)

    @cached_property
    def team(self) -> Team:
        return Team(self._raw_client, self._server, self._auth)

    @cached_property
    def trust_rail(self) -> TrustRail:
        return TrustRail(self._raw_client, self._server, self._auth)

    def close(self) -> None:
        self._raw_client.http_client.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None
    ) -> None:
        self.close()


Client = QuartermasterAiTrustRailApiClient
