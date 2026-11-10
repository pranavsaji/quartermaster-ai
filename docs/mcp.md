# Use TrustRail from any agent (MCP)

`apps/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets any
MCP-capable agent — Claude Desktop, Cursor, ChatGPT connectors, your own agent — buy through
Quartermaster with TrustRail in the loop. It shows that TrustRail is a layer for agents in
general, not only for Quartermaster's built-in agent: whichever model drives the conversation, the
carts it proposes go through the same Spend Mandate, policy engine and owner approval.

The server speaks MCP over stdio and calls the existing Quartermaster v1 API as one workspace
member. It adds no API routes and holds no credentials beyond that member's sign-in.

## What an agent can do

| Tool                      | API route                                  | What it returns                                                                                                          |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `list_inventory`          | `GET /inventory`                           | Stock items with on-hand, available, reorder point, days of cover and status (optionally only LOW/CRITICAL/OUT).         |
| `get_spend_mandate`       | `GET /mandates/current`                    | The active mandate (budgets, limits, approved suppliers, categories, rules) and this week's remaining budget. Read-only. |
| `list_suppliers`          | `GET /suppliers`                           | Suppliers with mandate approval, checkout eligibility, quarantine flag, lead time and catalog size.                      |
| `create_purchase_request` | `POST /procurement/requests`               | A new request id from a plain-language instruction (optional budget cap, date, alternatives).                            |
| `research_request`        | `POST /procurement/requests/{id}/research` | TrustRail's verdict: each proposal allowed or blocked with reason codes, quarantined sources and findings.               |
| `evaluate_request`        | `POST /procurement/requests/{id}/evaluate` | The same summary after TrustRail re-runs on the open proposals against the current mandate and budget.                   |
| `get_request`             | `GET /procurement/requests/{id}`           | The request's current state, including whether the owner has approved, rejected or paid.                                 |
| `list_security_events`    | `GET /security/events`                     | TrustRail findings (prompt injection, unauthorized fees, blocked carts and payments), filterable by type and severity.   |

Every result is concise JSON. A request summary looks like this (abridged):

```json
{
  "request_id": "6f1c…",
  "status": "READY_FOR_REVIEW",
  "trustrail": { "outcome": "ALLOWED_PENDING_OWNER_APPROVAL", "allowed_proposals": 2, "blocked_proposals": 1, "next_step": "…" },
  "proposals": [
    {
      "supplier": "QuickServe Packaging Co.",
      "status": "BLOCKED",
      "allowed": false,
      "trustrail_decision": "BLOCK",
      "total": "156.40 USD",
      "reasons": [
        {
          "code": "QUARANTINED_SOURCE",
          "severity": "BLOCK",
          "detail": "<untrusted-… source=\"trustrail:QUARANTINED_SOURCE\">…</untrusted-…>"
        }
      ]
    },
    {
      "supplier": "Harbor Restaurant Supply",
      "status": "PROPOSED",
      "allowed": true,
      "total": "173.20 USD",
      "owner_must_acknowledge": ["MARKET_REFERENCE_UNAVAILABLE"]
    }
  ],
  "quarantined_sources": [{ "kind": "CATALOG_LISTING", "supplier": "QuickServe Packaging Co.", "sku": "QS-TK32-300" }],
  "owner_action": { "approve_in_app": "http://localhost:3000/procurement/6f1c…", "note": "This agent can only propose. …" }
}
```

## Security model: the agent proposes, the owner approves and pays

- **No money tools.** There is deliberately no approve, reject, pay, capture, refund, mandate-edit or
  supplier-approval tool, and every tool description says so. Approval of the exact cart (which
  signs the Intent Certificate) and PayPal checkout happen only in the Quartermaster app, by the
  owner. The MCP server never calls PayPal.
- **Use a MANAGER account.** Give the server the credentials of a MANAGER: managers can create and
  research requests, but the API itself refuses approval, payment, refunds and mandate edits to
  anyone but an OWNER (`403 ROLE_REQUIRED`). Even a modified MCP server cannot approve with that
  login. The test suite checks this.
- **Mandate facts come from the database.** TrustRail evaluates carts against the stored Spend
  Mandate, catalog prices and supplier terms, never against anything the agent says. The agent can
  read the mandate (`get_spend_mandate`) but not change it, and a cart line that is not a verified
  catalog price or published supplier term is blocked as `UNAUTHORIZED_LINE_ITEM`.
- **Untrusted text is fenced.** Supplier descriptions, listing titles, line descriptions, violation
  details, finding text and the recommendation can contain text written by suppliers, market
  listings or a model. The server wraps each in TrustRail's `fenceUntrusted` (escaped, inside an
  `<untrusted-{random nonce}>` boundary) and its instructions tell the agent never to follow
  instructions inside those tags. Codes, ids, statuses and amounts are system-generated and plain.
- **Credentials stay local.** The password and session cookie live only in the server process;
  they are never logged or put in tool results. Failures come back as fixed messages with a code
  (`SIGN_IN_FAILED`, `API_UNREACHABLE`, `ROLE_REQUIRED`, …), never stack traces. When the session
  expires the server signs in once more and retries. Plain `http://` is accepted only for
  `localhost`.
- **Same limits as the app.** Requests are subject to the API's rate limits (research is capped per
  user), CSRF header, idempotency keys and audit log, exactly like the web app.

## Configuration

| Variable        | Required | Meaning                                                                                       |
| --------------- | -------- | --------------------------------------------------------------------------------------------- |
| `QM_API_URL`    | yes      | API origin, e.g. `http://localhost:4000` or your deployed API (`https://…`).                  |
| `QM_EMAIL`      | yes      | The member the agent acts as; use a MANAGER (`manager@demo.quartermaster.dev` in the sample). |
| `QM_PASSWORD`   | yes      | That member's password (for the sample workspace, your `DEMO_USER_PASSWORD`).                 |
| `QM_APP_URL`    | no       | Web app origin for approval links, e.g. `http://localhost:3000`; otherwise links are paths.   |
| `QM_TIMEOUT_MS` | no       | Per-request timeout (default 180000; research can take a while with real market data).        |

## Run it

With the stack running (`pnpm dev`):

```bash
pnpm --filter @qm/mcp build        # optional: a bundled apps/mcp/dist/index.js for desktop clients
QM_PASSWORD=… pnpm mcp:demo         # an MCP client walks mandate → create → research → evaluate
```

`pnpm --silent mcp` starts the server on stdio from source (keep `--silent`: without it pnpm prints
a banner on stdout, which corrupts the protocol). The MCP Inspector works too: from the repository
root, with the `QM_*` variables exported, run `npx @modelcontextprotocol/inspector pnpm --silent mcp`.

### Claude Desktop

Add the server to `claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`), using absolute paths. Desktop
apps often do not see your shell's `PATH`, so point `command` at your Node binary (`which node`):

```json
{
  "mcpServers": {
    "quartermaster": {
      "command": "/usr/local/bin/node",
      "args": ["/path/to/quartermaster/apps/mcp/dist/index.js"],
      "env": {
        "QM_API_URL": "http://localhost:4000",
        "QM_APP_URL": "http://localhost:3000",
        "QM_EMAIL": "manager@demo.quartermaster.dev",
        "QM_PASSWORD": "your-demo-user-password"
      }
    }
  }
}
```

To run from source instead of the build, use
`"command": "/path/to/quartermaster/node_modules/.bin/tsx", "args": ["/path/to/quartermaster/apps/mcp/src/index.ts"]`.
Cursor (`.cursor/mcp.json`) and other clients take the same `command`, `args` and `env`.

Then ask, for example: _"Check our spend mandate, then restock takeout containers and cooking oil
for a busy weekend without exceeding $300, and tell me what TrustRail decided."_ The agent creates
and researches the request, reports the allowed and blocked carts (in the sample workspace the
QuickServe cart is blocked: its listing carries a prompt injection and a smuggled service charge),
and hands you the link where the owner approves.

## Notes

- Research uses whatever the API is configured with (Channel3 market data, OpenAI), exactly as the
  web app does. Without keys it runs deterministically and labels prices for human review.
- On the shared sample workspace, research proposes nothing when stock is already above the reorder
  point; the request then ends `BLOCKED` with "no purchase is needed".
- Tests: `tests/integration/mcp-server.test.ts` drives the tools over an in-memory MCP transport and
  over stdio against the API harness (PGlite, fake PayPal).
