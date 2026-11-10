"""Quartermaster quickstart with the APIMatic-generated Python SDK.

    python3 -m venv .venv && . .venv/bin/activate && pip install ./sdk/python
    QM_EMAIL=owner@demo.quartermaster.dev QM_PASSWORD=... python examples/quickstart.py
    QM_BASE_URL=http://localhost:4000/api/v1 QM_EMAIL=... QM_PASSWORD=... python examples/quickstart.py

Signs in, then prints low stock and this week's remaining budget under the Spend Mandate.
"""

import os
import re
import sys

from quartermaster_ai_trust_rail_api import QuartermasterAiTrustRailApiClient
from quartermaster_ai_trust_rail_api.core.results import Success

email, password = os.environ.get("QM_EMAIL"), os.environ.get("QM_PASSWORD")
base_url = os.environ.get("QM_BASE_URL")
if not email or not password:
    sys.exit("Set QM_EMAIL and QM_PASSWORD (see the README's 'For judges' section).")
local = bool(base_url and base_url.startswith("http://"))
server = {"environment": "local", "base_url": base_url} if local else {"environment": "hosted"}

# 1. Sign in. The session arrives as an httpOnly cookie, read from the raw response headers.
with QuartermasterAiTrustRailApiClient(**server) as anonymous:
    result = anonymous.accounts_api.with_raw_response.login("quartermaster", {"email": email, "password": password})
if not isinstance(result, Success):
    sys.exit(f"Sign-in failed: {result}")
match = re.search(r"qm_session=([^;]+)", result.headers.get("set-cookie", ""))
if not match:
    sys.exit("No session cookie in the sign-in response")
user = result.payload.user
print(f"Signed in as {user.name} ({user.role}) at {user.organization.name}")

credentials = {"session": match.group(1)} if local else {"secure_session": match.group(1)}
with QuartermasterAiTrustRailApiClient(**server, **credentials) as client:
    # 2. Stock that needs attention, and what is left of this week's budget.
    for item in client.inventory_api.list_inventory().items:
        if item.status != "OK":
            print(f"  {item.status:<8} {item.name}: {item.on_hand} {item.unit} on hand")
    mandate = client.trust_rail.get_spend_mandate()
    budget = mandate.budget
    print(f"Spend Mandate v{mandate.mandate.version}: ${budget.remaining_minor / 100:.2f} left of ${budget.limit_minor / 100:.2f} this week")
