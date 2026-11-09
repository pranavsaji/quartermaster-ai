# Quartermaster AI — secured by TrustRail

**Autonomous purchasing for small businesses, with cryptographically verifiable spending authority.**

Quartermaster is an AI procurement assistant for restaurants and cafés. It watches inventory, forecasts what to reorder, compares suppliers on true delivered cost, and prepares purchases — then pays through **PayPal** only after **TrustRail** has proven the purchase is within the owner's rules and the owner has approved the exact cart.

> A restaurant owner says: _"We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300."_
> Quartermaster forecasts 25% higher demand, finds that the cheapest supplier's listing contains a hidden prompt injection and an undisclosed $24.50 "priority service charge", watches TrustRail block that cart, re-plans to compliant suppliers ($278.20 total), and — after the owner approves — completes a PayPal sandbox checkout bound to an Ed25519-signed Intent Certificate.

|                             |                                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer product**        | Quartermaster — inventory, forecasting, supplier comparison, approvals, payments, deliveries, invoices, analytics                               |
| **Security infrastructure** | TrustRail — Spend Mandates, deterministic policy engine, prompt-injection defense, Intent Certificates, capture guard, tamper-evident audit log |
| **Payments**                | PayPal Orders v2 (server) + JavaScript SDK v6 (browser), sandbox                                                                                |
| **Market evidence**         | Channel3 product search (reference prices only)                                                                                                 |
| **AI**                      | OpenAI strict structured outputs, with a labelled deterministic fallback                                                                        |

---

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

`render.yaml` deploys the web app, the API (pre-deploy migrations, `/readyz` health check), a 5-minute sweeper cron (PayPal reconciliation, certificate expiry, purges) and Postgres 17. Set the `sync: false` secrets in the Render dashboard, then seed once with `node apps/api/dist/seed.js` from a Render shell. See [docs/operations.md](docs/operations.md).

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
