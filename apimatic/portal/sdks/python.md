# Python SDK (/sdks/python)

[Download SDK](/__downloads/sdk/python.zip)

## Intro [#intro]

The Quartermaster AI + TrustRail API SDK provides access to the Quartermaster AI + TrustRail API REST APIs.

Autonomous procurement secured by TrustRail. Amounts are integer minor units (cents). Sign in with `POST /auth/login` (or `/auth/signup`): the API sets an httpOnly session cookie. Every mutation requires the header `X-Requested-With: quartermaster`; routes marked idempotent also require an `Idempotency-Key`. Errors share one shape (`ApiError`) with a stable `code`.

## Installation [#installation]

Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `../quartermaster-ai-trust-rail-api` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:

```bash
pip install <path-to-sdk>
```

```bash
uv add <path-to-sdk>
```

```bash
poetry add <path-to-sdk>
```

## Quick Start [#quick-start]

### Synchronous client [#synchronous-client]

Construct `QuartermasterAiTrustRailApiClient` with keyword arguments, and call `close()` when you are done. Every argument is optional.

```python
from quartermaster_ai_trust_rail_api import QuartermasterAiTrustRailApiClient

client = QuartermasterAiTrustRailApiClient(session="YOUR_API_KEY", secure_session="YOUR_API_KEY", environment="hosted")

client.close()
```

Alternatively, scope it — `with QuartermasterAiTrustRailApiClient(...) as client:` closes the pool on exit.

### Asynchronous client [#asynchronous-client]

`AsyncQuartermasterAiTrustRailApiClient` mirrors `QuartermasterAiTrustRailApiClient` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `custom_async_http_client`.

```python
from asyncio import run

from quartermaster_ai_trust_rail_api import AsyncQuartermasterAiTrustRailApiClient

async def main() -> None:
    client = AsyncQuartermasterAiTrustRailApiClient(
        session="YOUR_API_KEY", secure_session="YOUR_API_KEY", environment="hosted"
    )
    await client.aclose()

run(main())
```

Alternatively, scope it — `async with AsyncQuartermasterAiTrustRailApiClient(...) as client:` closes the pool on exit.