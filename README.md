# Quartermaster AI — secured by TrustRail

**Autonomous purchasing for small businesses, with cryptographically verifiable spending authority.**

Quartermaster is an AI procurement assistant for restaurants and cafés. It watches inventory, forecasts what to reorder, compares suppliers on true delivered cost, and prepares purchases — then pays through **PayPal** only after **TrustRail** has proven the purchase is within the owner's rules and the owner has approved the exact cart.

**Live demo (PayPal sandbox):** <https://quartermaster-web-o0df.onrender.com> · **API docs and SDKs (APIMatic):** <https://quartermaster-api-docs.onrender.com>. Judges: see [For judges](#for-judges).

> A restaurant owner says: _"We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300."_
> Quartermaster forecasts 25% higher demand, finds that the cheapest supplier's listing contains a hidden prompt injection and an undisclosed $24.50 "priority service charge", watches TrustRail block that cart, re-plans to compliant suppliers ($278.20 total), and — after the owner approves — completes a PayPal sandbox checkout bound to an Ed25519-signed Intent Certificate.

|                             |                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer product**        | Quartermaster — inventory, forecasting, supplier comparison, approvals, payments, deliveries, invoices, analytics                                                                |
| **Security infrastructure** | TrustRail — Spend Mandates, deterministic policy engine, prompt-injection defense, Intent Certificates, capture guard, tamper-evident audit log                                  |
| **Payments**                | PayPal Orders v2 (server) + JavaScript SDK v6 (browser), sandbox                                                                                                                 |
| **Market evidence**         | Channel3 product search (reference prices only)                                                                                                                                  |
| **AI**                      | OpenAI strict structured outputs, with a labelled deterministic fallback                                                                                                         |
| **Data grids and charts**   | 11 AG Grid grids on 8 screens, with in-grid editing of stock and catalog prices, and AG Charts for analytics. See [How we use AG Grid](#how-we-use-ag-grid)                      |
| **Hosting**                 | Render (web, API, Postgres)                                                                                                                                                      |
| **Notifications**           | Zapier webhook on completed payments; operator alerts by email and webhook                                                                                                       |
| **Accounts and teams**      | Self-service sign-up, invitations with roles, password reset by email or owner-issued link                                                                                       |
| **Error tracking**          | Built-in grouped error tracking with alert throttling, health monitors, optional Sentry forwarding                                                                               |
| **API tooling**             | OpenAPI 3.1 spec and Postman collection, generated from the route table; **APIMatic** TypeScript and Python SDKs and docs portal. See [APIMatic](#apimatic-sdks-and-docs-portal) |
| **Scheduling**              | **Bryntum Scheduler** delivery timeline with drag-to-reschedule. See [Bryntum](#bryntum-delivery-schedule)                                                                       |

## For judges

**Live app:** <https://quartermaster-web-o0df.onrender.com>. It runs on Render's free plan, so the first request after 15 idle minutes takes about a minute while the services wake up. Health check: <https://quartermaster-api-sziv.onrender.com/readyz>.

**Create your own workspace (recommended):** choose **Create an account** on the sign-in page and keep **Start with sample data** ticked. You get a private copy of the sample restaurant (suppliers, stock, 14 days of usage and the deliberately malicious QuickServe listing), so nothing you do affects other judges. You can then invite teammates from **Team**, add suppliers and catalog listings under **Suppliers**, and add stock items under **Inventory**.

**Or use the shared sample workspace:**

| Account                          | Role                                       | Password                |
| -------------------------------- | ------------------------------------------ | ----------------------- |
| `owner@demo.quartermaster.dev`   | Owner: approves and pays                   | `trustrail-judges-2026` |
| `manager@demo.quartermaster.dev` | Manager: requests and research, no payment | `trustrail-judges-2026` |
| `viewer@demo.quartermaster.dev`  | Read-only                                  | `trustrail-judges-2026` |

The shared workspace is persistent: other judges' orders stay, and its weekly budget is shared, so a private workspace is the cleaner way to test.

**Paying (PayPal sandbox, no real money):** in the PayPal window, sign in with the sandbox buyer account given in the Devpost testing instructions, or choose **Pay with Debit or Credit Card** and use a [PayPal sandbox test card](https://developer.paypal.com/tools/sandbox/card-testing/).

**A five-minute path through the product:**

1. Sign up with sample data (or sign in as the owner). **Procurement → New request:** _"We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300."_
2. Watch the agent research: interpretation, forecast, Channel3 market prices and the supplier comparison.
3. The cheapest supplier (QuickServe) is **blocked by TrustRail**: its listing hides a fee and a prompt injection. Open the finding.
4. Approve a compliant proposal, click **Verify** on the Intent Certificate, then **Pay with PayPal**.
5. Check **Orders & invoices** (submit the invoice, then try "Simulate duplicate invoice"), the **Security center** (audit chain valid) and **Analytics**.

To run it locally instead, follow [Quick start](#quick-start-local-no-external-accounts): it needs no external accounts.

---

## How we use AG Grid

AG Grid (Community, v36) is where the restaurant's operational data lives and where people act on
it, not just a way to display rows. Every grid shares one wrapper (`apps/web/components/grid/DataGrid.tsx`)
that registers only the Community modules we use, applies a Theming API theme built from the app's
design tokens, and adds a toolbar.

| Where                                         | What AG Grid does                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inventory**                                 | A spreadsheet for stock. Managers type over **On hand**, **Safety stock** and **Cover target**. Each edit is validated, saved through the API (a stock count becomes an audited adjustment that refuses stale values) and flashed when saved. An edit that fails reverts, and edits can be undone. |
| **Supplier catalog**                          | Price per pack, units per pack and availability edited in place, typed in dollars and stored as integer cents. Quarantined listings (prompt injection found) are locked and show why.                                                                                                              |
| **Supplier comparison** (procurement request) | The agent's candidate offers, grouped by item, eligible offers first, sorted by delivered unit cost. The best offer per item is highlighted, quarantined and blocked offers are marked, and a **vs market** column compares each price with Channel3.                                              |
| **Orders and invoices**                       | Pinned totals rows (paid spend, invoice totals, blocked settlements) that recompute for whatever the search and filters leave visible.                                                                                                                                                             |
| **Security**                                  | Findings, TrustRail policy decisions (with violation codes searchable) and the hash-chained audit log.                                                                                                                                                                                             |
| **Suppliers, Team, Procurement requests**     | List views with row actions (role changes, reset links, removal) inside the grid.                                                                                                                                                                                                                  |

Every grid toolbar has a search across all columns, a live "N of M" count and column filters.
**Export CSV** exports the formatted values, with spreadsheet formulas neutralised. Sort, filters
and column widths are remembered per browser through the grid state API. **AG Charts** draws the
analytics charts: spend against budget, spend by supplier and category, a donut of TrustRail
decisions, findings by type, and days of stock cover per item against its target. Each chart has a
table view and an empty state.

## APIMatic: SDKs and docs portal

The API's OpenAPI 3.1 spec (`pnpm docs:api`) is the single source for everything APIMatic builds.
It is generated from the route table, with response schemas from the TypeScript DTOs, request
schemas from the Zod contracts, stable `operationId`s and named environments. A contract test
(`tests/integration/openapi-contract.test.ts`) validates real API responses against it, so the
SDKs cannot drift from what the server sends. APIMatic's validator and Redocly both pass it with
no errors.

| Output               | Where                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript SDK       | [`apimatic/sdk/typescript`](apimatic/sdk/typescript): typed client, both session cookies, Hosted/Local environments                                                          |
| Python SDK           | [`apimatic/sdk/python`](apimatic/sdk/python): sync and async clients                                                                                                         |
| API docs portal      | **<https://quartermaster-api-docs.onrender.com>** (source: [`apimatic/portal`](apimatic/portal)): API reference with SDK samples, a quickstart, `llms.txt` for coding agents |
| Runnable quickstarts | [`apimatic/examples`](apimatic/examples): sign in, read stock and the mandate, ask the agent to restock                                                                      |

Run against the hosted demo or a local API (`QM_BASE_URL=http://localhost:4000/api/v1`):

```bash
cd apimatic/sdk/typescript && npm install && npm run build && cd ../..
QM_EMAIL=owner@demo.quartermaster.dev QM_PASSWORD=trustrail-judges-2026 node examples/quickstart.mjs
```

The TypeScript quickstart prints low stock and the remaining weekly budget. It then shows TrustRail
blocking QuickServe (`QUARANTINED_SOURCE`, `UNAUTHORIZED_LINE_ITEM`) and proposing Harbor for
$173.20, which is the same decision the web app shows. To regenerate after an API change, run
`pnpm docs:api`, then `npx @apimatic/cli@2 sdk generate -l typescript` and `portal generate` in `apimatic/`.

## Bryntum: delivery schedule

**Delivery schedule** (`/deliveries`) uses Bryntum Scheduler to show every paid order's
delivery on one timeline: one row per supplier, a bar from order date to expected date, coloured
by status, with a "now" line and 2-week and month views. Managers drag a delivery to a later
day to reschedule it. The drop opens the delay dialog with the new date filled in, the API
records the delay with its reason, and the bar reverts if the API refuses. A delayed delivery
keeps its original due day shaded. Viewers get a read-only timeline, and a list view gives the
same data to screen readers. The page uses Bryntum's public trial packages, which show a
watermark; a production deployment needs a Bryntum licence.

## Why this is safe to delegate

The language model **never** touches money. It interprets the owner's request and explains the recommendation; every number that matters is computed by deterministic code, and every payment passes four independent gates:

1. **Spend Mandate** — what the business permits across purchases (weekly budget, per-order limit, approved suppliers, allowed categories, market-price premium, duplicates, subscriptions). Versioned and immutable; tightening it revokes outstanding approvals.
2. **TrustRail policy engine** — a pure function over facts read from the system of record (never from the agent). Every cart line must map to a verified catalog price or a published supplier term; anything else — like a smuggled service charge — is `UNAUTHORIZED_LINE_ITEM`. Decisions are persisted with a digest of their inputs.
3. **Intent Certificate** — the owner's approval of one exact cart: cart hash, amount, supplier, mandate version, policy decision, buyer, expiry and nonce, signed with Ed25519 (domain-separated). Budget is reserved under a row lock in the same transaction.
4. **Capture guard** — immediately before PayPal capture, TrustRail re-verifies the certificate against the _current_ stored cart, re-runs the policy, and checks the PayPal order's status, amount, currency, intent binding, purchase-order binding, payee merchant and the budget reservation. Only the approving owner can complete payment.

Detail: [docs/security-model.md](docs/security-model.md) · Architecture: [docs/architecture.md](docs/architecture.md)

---

## Repository layout

```
apps/
  api/                 Express API — orchestration, TrustRail enforcement, protected PayPal gateway
  web/                 Next.js app — overview, procurement workspace, approvals, mandate, security center, orders, analytics
packages/
  contracts/           Zod request schemas, response DTOs, money helpers (shared by API and web)
  trustrail/           Canonical encoding, cart hashing, policy engine, injection detection, certificates, capture guard
  quartermaster/       Forecasting, pack-size normalisation, supplier comparison, planning, invoice matching
  payments/            PayPal REST client (OAuth, Orders v2, capture, refunds, webhook verification)
  integrations/        Channel3 search, OpenAI structured outputs, Zapier notifications
  database/            Drizzle schema, migrations, Postgres/PGlite client, labelled demo seed
tests/
  unit/ adversarial/ integration/ e2e/   Vitest suites, Playwright + axe journeys
docs/                  Architecture, security model, API reference, operations runbook, demo script
postman/               Postman collection for the HTTP API
render.yaml            Render blueprint (web, API, sweeper cron, Postgres)
```

---

## Quick start (local, no external accounts)

Requirements: Node.js ≥ 22.12 and pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env
pnpm keys:generate >> .env          # TrustRail Ed25519 signing key
echo "DEMO_USER_PASSWORD=choose-a-long-password" >> .env
pnpm db:seed                         # embedded PostgreSQL (PGlite) under ./.data
pnpm dev                             # API on :4000, web on :3000
```

Sign in at <http://localhost:3000> as `owner@demo.quartermaster.dev` (also `manager@…`, `viewer@…`) with your `DEMO_USER_PASSWORD`.

Without API keys the system runs honestly degraded and labels it everywhere: deterministic interpretation instead of the LLM, "market data disabled" (every price needs human review), and "PayPal sandbox not configured" instead of a checkout button. Nothing is simulated as if it were real.

### Enabling the real integrations

| Variable                                   | Where to get it                                                                                                                   | Effect                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | developer.paypal.com → Apps & Credentials (Sandbox)                                                                               | Real sandbox orders and captures        |
| `PAYPAL_WEBHOOK_ID`                        | Your sandbox app → Webhooks → add `https://<api>/api/v1/webhooks/paypal` (events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.*`) | Verified webhook reconciliation         |
| `PAYPAL_MERCHANT_ID`                       | Sandbox business account → Account info                                                                                           | Captures to any other payee are refused |
| `CHANNEL3_API_KEY`                         | channel3.ai                                                                                                                       | Live market reference prices            |
| `OPENAI_API_KEY` (+ `OPENAI_MODEL`)        | platform.openai.com                                                                                                               | LLM interpretation and explanations     |
| `ZAPIER_WEBHOOK_URL`                       | Zapier Catch Hook                                                                                                                 | Notification-only alerts                |

Use a separate sandbox **Personal** account to approve payments in the PayPal popup.

### Using PostgreSQL instead of PGlite

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/quartermaster pnpm db:migrate
DATABASE_URL=postgres://user:pass@localhost:5432/quartermaster pnpm db:seed
```

---

## Testing and quality gates

```bash
pnpm typecheck        # every package, plus tests and scripts
pnpm lint             # ESLint with type-aware rules; purity rules for trustrail/quartermaster
pnpm format:check     # Prettier
pnpm test             # unit, property, adversarial and integration suites (PGlite + fake PayPal)
pnpm test:coverage    # same, with enforced coverage floors
pnpm test:web         # web app: Vitest + Testing Library
pnpm build && E2E_PASSWORD=… pnpm test:e2e   # Playwright journeys + axe WCAG 2.1 AA scans
HARNESS_DATABASE_URL=postgres://… pnpm vitest run tests/integration --no-file-parallelism   # real PostgreSQL
```

CI runs all of the above on every push, plus the integration suite on PostgreSQL 17, a dependency
audit, CodeQL (security-extended) and a container build that applies the migrations. Render deploys
only after CI passes.

What the suites prove (all reproducible from this repository):

| Area                    | Examples                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Policy & budget         | weekly/per-order/request caps, reservations counted, unapproved suppliers, category relabelling, subscriptions, stale or future market data, duplicate windows, over-purchase, digests that bind every input, totality on malformed input                                                                                                                                                                                                                                                                                                                                                  |
| Prompt injection        | 53-entry bypass regression corpus (invisible/tag characters, bidi isolates, homoglyphs, letter-spacing, HTML entities, short base64, overrides in six other languages) each quarantined; product words never hide an attack. Recall on attacks written independently of the rules: 82-attack held-out set (written before tuning) 95% quarantined / 99% flagged; a fresh 37-attack round never tuned against 51% / 59% — unseen paraphrases still get through, which is why policy never depends on detection. 305 benign listings, none flagged; linear time on 1.6 MB adversarial inputs |
| Properties (fast-check) | canonical JSON idempotence and key-order invariance, money round trips, carts always balance, policy never throws and never ALLOWs when any fact has the wrong type, certificate verification total over arbitrary JSON, parsers never throw                                                                                                                                                                                                                                                                                                                                               |
| Cart tampering          | undisclosed fees, repeated or inflated published fees, waived-shipping abuse, extra tax lines, catalog price drift, split SKUs, forged totals — each asserting the specific violation                                                                                                                                                                                                                                                                                                                                                                                                      |
| Certificates & capture  | tampered payloads, foreign keys, malformed signatures, not-before and expiry, revocation, rotation, PayPal amount/currency/payee/intent mismatches, the full payment state-transition matrix                                                                                                                                                                                                                                                                                                                                                                                               |
| Payments & webhooks     | lost or failed capture responses, failures after a real capture, deadlock retries, declines, order mismatches, pending refunds, reversals, late captures, webhook guard and exact verification requests                                                                                                                                                                                                                                                                                                                                                                                    |
| Concurrency             | 12 parallel reservations against a $500 budget on real PostgreSQL → exactly 5 succeed; approval vs research vs rejection serialised on the request row                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Database                | CHECK constraints reject unknown statuses, negative budgets, over-refunds and unbalanced totals; the audit log refuses UPDATE/DELETE                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Platform                | trusted-proxy rate limits, atomic sign-in lockout, graceful shutdown, correlation ids in every log line, production config refusal                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Web                     | open-redirect guard, race-safe polling, ambiguous payment outcomes, numeric input validation, CSP, keyboard-operable grids, no serious axe violations on any page                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## Deployment

`render.yaml` deploys the web app, the API (pre-deploy migrations, `/readyz` health check), a 5-minute sweeper cron (PayPal reconciliation, certificate expiry, purges) and Postgres 17. Set the `sync: false` secrets in the Render dashboard, then seed once with `node apps/api/dist/seed.js` from a Render shell. The live demo runs on Render's free plan instead (no cron, shell or pre-deploy step); [docs/operations.md](docs/operations.md) describes both.

---

## Honest scope

- Suppliers are **sandbox demo suppliers** whose payments settle to the platform's PayPal sandbox merchant. Channel3 results are market _evidence_; Quartermaster does not check out with retailers.
- Inventory and consumption history are **synthetic** and labelled. Forecasting is an explainable reorder-point model, not a validated demand model.
- Deliveries and goods receipts are **synthetic**; inventory increases only when receipt is confirmed.
- Live PayPal is deliberately disabled in this release; every payment requires a human owner.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks and the invariants every change must keep, and
[SECURITY.md](SECURITY.md) for reporting vulnerabilities privately.

## License

Apache-2.0 — see [LICENSE](LICENSE).
