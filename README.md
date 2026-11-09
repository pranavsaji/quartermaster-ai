# Quartermaster AI — secured by TrustRail

**Autonomous purchasing for small businesses, with cryptographically verifiable spending authority.**

Quartermaster is an AI procurement assistant for restaurants and cafés. It watches inventory, forecasts what to reorder, compares suppliers on true delivered cost, and prepares purchases — then pays through **PayPal** only after **TrustRail** has proven the purchase is within the owner's rules and the owner has approved the exact cart.

> A restaurant owner says: *"We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300."*
> Quartermaster forecasts 25% higher demand, finds that the cheapest supplier's listing contains a hidden prompt injection and an undisclosed $24.50 "priority service charge", watches TrustRail block that cart, re-plans to compliant suppliers ($278.20 total), and — after the owner approves — completes a PayPal sandbox checkout bound to an Ed25519-signed Intent Certificate.

| | |
|---|---|
| **Customer product** | Quartermaster — inventory, forecasting, supplier comparison, approvals, payments, deliveries, invoices, analytics |
| **Security infrastructure** | TrustRail — Spend Mandates, deterministic policy engine, prompt-injection defense, Intent Certificates, capture guard, tamper-evident audit log |
| **Payments** | PayPal Orders v2 (server) + JavaScript SDK v6 (browser), sandbox |
| **Market evidence** | Channel3 product search (reference prices only) |
| **AI** | OpenAI strict structured outputs, with a labelled deterministic fallback |

---

## Why this is safe to delegate

The language model **never** touches money. It interprets the owner's request and explains the recommendation; every number that matters is computed by deterministic code, and every payment passes four independent gates:

1. **Spend Mandate** — what the business permits across purchases (weekly budget, per-order limit, approved suppliers, allowed categories, market-price premium, duplicates, subscriptions). Versioned and immutable; tightening it revokes outstanding approvals.
2. **TrustRail policy engine** — a pure function over facts read from the system of record (never from the agent). Every cart line must map to a verified catalog price or a published supplier term; anything else — like a smuggled service charge — is `UNAUTHORIZED_LINE_ITEM`. Decisions are persisted with a digest of their inputs.
3. **Intent Certificate** — the owner's approval of one exact cart: cart hash, amount, supplier, mandate version, policy decision, buyer, expiry and nonce, signed with Ed25519 (domain-separated). Budget is reserved under a row lock in the same transaction.
4. **Capture guard** — immediately before PayPal capture, TrustRail re-verifies the certificate against the *current* stored cart, re-runs the policy, and checks the PayPal order's status, amount, currency, intent binding, purchase-order binding, payee merchant and the budget reservation. Only the approving owner can complete payment.

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
  unit/ adversarial/ integration/   Vitest suites (259 tests)
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

| Variable | Where to get it | Effect |
|---|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | developer.paypal.com → Apps & Credentials (Sandbox) | Real sandbox orders and captures |
| `PAYPAL_WEBHOOK_ID` | Your sandbox app → Webhooks → add `https://<api>/api/v1/webhooks/paypal` (events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.*`) | Verified webhook reconciliation |
| `PAYPAL_MERCHANT_ID` | Sandbox business account → Account info | Captures to any other payee are refused |
| `CHANNEL3_API_KEY` | channel3.ai | Live market reference prices |
| `OPENAI_API_KEY` (+ `OPENAI_MODEL`) | platform.openai.com | LLM interpretation and explanations |
| `ZAPIER_WEBHOOK_URL` | Zapier Catch Hook | Notification-only alerts |

Use a separate sandbox **Personal** account to approve payments in the PayPal popup.

### Using PostgreSQL instead of PGlite

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/quartermaster pnpm db:migrate
DATABASE_URL=postgres://user:pass@localhost:5432/quartermaster pnpm db:seed
```

---

## Testing

```bash
pnpm test                                            # 259 tests: unit, adversarial, integration (PGlite + fake PayPal)
TEST_DATABASE_URL=postgres://… pnpm test             # also runs real-Postgres concurrency tests
HARNESS_DATABASE_URL=postgres://… pnpm test          # runs the integration suite on real Postgres
pnpm typecheck
```

What the suites prove (all reproducible from this repository):

| Area | Examples |
|---|---|
| Policy & budget (34) | weekly/per-order/request caps, reservations counted, unapproved suppliers, category relabelling, subscriptions, stale or non-comparable market data, duplicate windows, over-purchase, deterministic digests |
| Prompt injection (37) | 22 attack phrasings incl. zero-width, homoglyph, letter-spacing, leetspeak, hidden markup and base64 payloads; 8 benign listings with no false positives; delimiter-escape-proof fencing; escalate-only classifier merge |
| Cart tampering (17) | undisclosed fees, repeated or inflated published fees, waived-shipping abuse, extra tax lines, catalog price drift, split SKUs, forged totals, hash sensitivity |
| Certificates & capture (43) | tampered payloads, foreign keys, wrong order, expiry, revocation, consumption, PayPal amount/currency/payee/intent mismatches, monotonic payment states |
| Payments & webhooks | one PayPal order per intent under retries, capture before buyer approval refused, lost capture response reconciled, duplicate capture is the same logical payment, webhook dedupe, invalid signatures and foreign cert URLs rejected |
| Concurrency | 12 parallel reservations against a $500 budget on real Postgres → exactly 5 succeed |
| Inventory, suppliers, invoices | plan's worked example (reorder point 240), delivered-cost ranking, pack parsing, duplicate and renumbered invoices, over-billing, single settlement per order |

---

## Deployment

`render.yaml` deploys the web app, the API (pre-deploy migrations, `/readyz` health check), a 5-minute sweeper cron (PayPal reconciliation, certificate expiry, purges) and Postgres 17. Set the `sync: false` secrets in the Render dashboard, then seed once with `node apps/api/dist/seed.js` from a Render shell. See [docs/operations.md](docs/operations.md).

---

## Honest scope

- Suppliers are **sandbox demo suppliers** whose payments settle to the platform's PayPal sandbox merchant. Channel3 results are market *evidence*; Quartermaster does not check out with retailers.
- Inventory and consumption history are **synthetic** and labelled. Forecasting is an explainable reorder-point model, not a validated demand model.
- Deliveries and goods receipts are **synthetic**; inventory increases only when receipt is confirmed.
- Live PayPal is deliberately disabled in this release; every payment requires a human owner.

## License

Apache-2.0 — see [LICENSE](LICENSE).
