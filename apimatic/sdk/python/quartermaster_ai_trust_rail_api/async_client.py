from __future__ import annotations

from functools import cached_property
from types import TracebackType

from typing_extensions import Self

from .apis.accounts_api import AsyncAccountsApi
from .apis.analytics import AsyncAnalytics
from .apis.inventory_api import AsyncInventoryApi
from .apis.operations import AsyncOperations
from .apis.orders import AsyncOrders
from .apis.payments_api import AsyncPaymentsApi
from .apis.procurement import AsyncProcurement
from .apis.security_api import AsyncSecurityApi
from .apis.suppliers import AsyncSuppliers
from .apis.system import AsyncSystem
from .apis.team import AsyncTeam
from .apis.trust_rail import AsyncTrustRail
from .auth import AsyncAuthSchemes
from .base_client import DEFAULT_TIMEOUT, BaseQuartermasterAiTrustRailApiClient
from .core import (
    OPERATING_SYSTEM,
    PYTHON_RUNTIME,
    ApiKeyCookieScheme,
    AsyncHttpClient,
    AsyncHttpx2Client,
    AsyncRawClient,
    LoggingOptionsOrDict,
    RetryOptionsOrDict,
    no_auth,
    param,
)
from .server.environment import Environment


class AsyncQuartermasterAiTrustRailApiClient(BaseQuartermasterAiTrustRailApiClient[AsyncRawClient]):
    def __init__(
        self,
        *,
        environment: Environment = "hosted",
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        retry_options: int | RetryOptionsOrDict | None = None,
        logging_options: LoggingOptionsOrDict | None = None,
        custom_async_http_client: AsyncHttpClient | None = None,
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
        self._raw_client = AsyncRawClient(
            http_client=(
                custom_async_http_client if custom_async_http_client is not None else AsyncHttpx2Client(timeout=timeout)
            ),
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
        self._auth = AsyncAuthSchemes(
            session=ApiKeyCookieScheme("qm_session", session) if session is not None else no_auth,
            secure_session=(
                ApiKeyCookieScheme("__Host-qm_session", secure_session) if secure_session is not None else no_auth
            ),
        )

    @cached_property
    def accounts_api(self) -> AsyncAccountsApi:
        return AsyncAccountsApi(self._raw_client, self._server, self._auth)

    @cached_property
    def analytics(self) -> AsyncAnalytics:
        return AsyncAnalytics(self._raw_client, self._server, self._auth)

    @cached_property
    def inventory_api(self) -> AsyncInventoryApi:
        return AsyncInventoryApi(self._raw_client, self._server, self._auth)

    @cached_property
    def operations(self) -> AsyncOperations:
        return AsyncOperations(self._raw_client, self._server, self._auth)

    @cached_property
    def orders(self) -> AsyncOrders:
        return AsyncOrders(self._raw_client, self._server, self._auth)

    @cached_property
    def payments_api(self) -> AsyncPaymentsApi:
        return AsyncPaymentsApi(self._raw_client, self._server, self._auth)

    @cached_property
    def procurement(self) -> AsyncProcurement:
        return AsyncProcurement(self._raw_client, self._server, self._auth)

    @cached_property
    def security_api(self) -> AsyncSecurityApi:
        return AsyncSecurityApi(self._raw_client, self._server, self._auth)

    @cached_property
    def suppliers(self) -> AsyncSuppliers:
        return AsyncSuppliers(self._raw_client, self._server, self._auth)

    @cached_property
    def system(self) -> AsyncSystem:
        return AsyncSystem(self._raw_client, self._server)

    @cached_property
    def team(self) -> AsyncTeam:
        return AsyncTeam(self._raw_client, self._server, self._auth)

    @cached_property
    def trust_rail(self) -> AsyncTrustRail:
        return AsyncTrustRail(self._raw_client, self._server, self._auth)

    async def aclose(self) -> None:
        await self._raw_client.http_client.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None
    ) -> None:
        await self.aclose()


AsyncClient = AsyncQuartermasterAiTrustRailApiClient
