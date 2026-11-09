# Architecture

Quartermaster is a **modular monolith**: one API process, one database, one web app. The
security boundary between the agent (Quartermaster) and enforcement (TrustRail) is logical — separate
packages with a one-way dependency — rather than a network hop.

```
┌──────────────────────────── apps/web (Next.js) ────────────────────────────┐
│ Overview · Inventory · Procurement workspace · Approvals · Mandate ·         │
│ Security Center · Orders & invoices · Analytics · PayPal JS SDK v6 button    │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ same-origin /api/* proxy (httpOnly session cookie, CSRF header)
┌───────────────▼──────────────────────── apps/api (Express) ─────────────────┐
│ http/   auth · CSRF · idempotency · validation · errors · rate limits        │
│ services/                                                                    │
│   procurement/research   bounded agent workflow (tool allowlist, deadline,   │
│                          token budget) — proposes, never pays                 │
│   procurement/lifecycle  create · evaluate · approve (sign + reserve) · reject │
│   policy                 gathers facts from the DB → TrustRail evaluatePolicy │
│   payments               PayPal order → capture guard → capture → reconcile   │
│   webhooks               verify → dedupe → reconcile via the same path        │
│   budget · mandates · certificates · audit · inventory · fulfillment ·        │
│   invoices · analytics · market (Channel3) · agent (OpenAI)                   │
│ jobs/sweeper             lease-elected: reconcile, expire, purge              │
└──────┬─────────────────┬──────────────────┬──────────────────┬──────────────┘
       │                 │                  │                  │
  packages/trustrail  packages/quartermaster  packages/payments  packages/integrations
  (pure, no I/O)      (pure, no I/O)          (PayPal REST)      (Channel3, OpenAI, Zapier)
       │
  packages/database — Drizzle schema · migrations · Postgres/PGlite
```

## Dependency rules

- `trustrail` and `quartermaster` are **pure**: no database, network or clock access. Every
  decision is a function of its input, which makes them exhaustively unit-testable.
- `quartermaster` may use `trustrail` types (carts), never the reverse.
- Only `apps/api/src/services/payments.ts` calls `captureOrder`, and only after `guardCapture`
  passes. No agent tool can reach it (`AGENT_TOOLS` in `services/agent/runtime.ts`).

## The purchasing journey

| Step               | Code                                                                                             | Persisted                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1. Request         | `POST /procurement/requests` → `createRequest`                                                   | `purchase_requests`, interpretation as `agent_runs`/`tool_executions`          |
| 2. Forecast        | `runForecast` (reorder point = usage × lead + safety)                                            | `forecast_runs`                                                                |
| 3. Market research | `researchItem` → Channel3 `/v1/search`, pack normalisation, median of comparable listings        | `market_quotes`                                                                |
| 4. Threat scan     | `detectPromptInjection` (+ optional escalate-only classifier) → quarantine                       | `supplier_catalog_items.quarantined`, `security_findings`                      |
| 5. Comparison      | `compareOffers` on delivered unit cost                                                           | `purchase_candidates`                                                          |
| 6. Planning        | `planCarts` + `fitCartsToCap`; re-plans globally after each block                                | `purchase_orders` (+ items, snapshot)                                          |
| 7. TrustRail       | `evaluateOrder` → `evaluatePolicy`                                                               | `policy_decisions` (stage EVALUATE)                                            |
| 8. Approval        | `approveProposal`: hash check, re-evaluate with budget row lock, acknowledgements, sign, reserve | `approval_events`, `intent_certificates`, `budget_reservations`                |
| 9. PayPal order    | `createPayPalOrder` with `PayPal-Request-Id = qm-create-<payment>`                               | `payment_attempts`                                                             |
| 10. Capture        | `capturePayment`: provider state → guard → `CAPTURE_PENDING` → capture → `finalizeFromOrder`     | payment `COMPLETED`, reservation → spend, certificate `CONSUMED`, `deliveries` |
| 11. Receipt        | `receiveDelivery` — only here does inventory increase                                            | `goods_receipts`, `stock_movements`                                            |
| 12. Invoice        | `analyzeAndRecordInvoice` three-way match                                                        | `invoices`, `invoice_matches`                                                  |

Every state change appends to the hash-chained `audit_events` log with the request's correlation id.

## Data model highlights

- **Money** is `BIGINT` minor units end to end; PayPal decimal strings exist only in `packages/payments/src/orders.ts`.
- **Proposals are immutable**: a cart is never edited. Re-research supersedes it; any change to a
  stored line changes the recomputed cart hash and fails certificate verification.
- **Snapshots**: each proposal stores the supplier terms, catalog prices and mandate version it was
  built from (`cart_snapshot`), so historical authorisations do not depend on mutable records.
- **Uniqueness as safety**: one payment attempt per certificate, unique PayPal order/capture/refund
  ids, unique webhook event ids, at most one ACTIVE/CONSUMED certificate per order, at most one
  settled invoice per order, one ACTIVE mandate per organization.

## Why a bounded workflow instead of an autonomous tool loop

The research pipeline is a fixed sequence of steps executed by `AgentRun`, each recorded as a tool
execution with timing and a summary shown in the UI. The model is invoked at two points with strict
JSON schemas — interpreting the instruction and explaining the result — and its output is sanitised
(unknown inventory ids dropped, multipliers clamped, dates validated). Retrying research is safe;
financial operations rely on persisted payment state and stable idempotency keys instead of agent retries.

## Degraded modes

| Missing                           | Behaviour                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| OpenAI                            | Deterministic interpreter and explainer; labelled `DETERMINISTIC_FALLBACK`                    |
| Channel3                          | Market reference `DISABLED`; every line gets `MARKET_REFERENCE_UNAVAILABLE` (review required) |
| PayPal                            | Approvals and certificates work; payment endpoints return `503 PAYPAL_NOT_CONFIGURED`         |
| PayPal unreachable during capture | Payment stays `CAPTURE_PENDING`; the sweeper reconciles by reading the order                  |
