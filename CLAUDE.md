# Quartermaster AI + TrustRail — repository guide

pnpm monorepo, TypeScript (strict, ESM, `moduleResolution: Bundler`). Node ≥ 22.12.

## Commands

- `pnpm dev` — API (:4000, tsx watch) + web (:3000). Needs `.env` (see `.env.example`); `pnpm keys:generate` for the signing key.
- `pnpm db:seed` — migrate + seed the shared sample workspace once (needs `DEMO_USER_PASSWORD`; `--reset` recreates it) and operator accounts (`OPERATOR_EMAILS` + `OPERATOR_PASSWORD`). Embedded PGlite under `.data/` unless `DATABASE_URL` is set.
- `pnpm test` — Vitest (unit, adversarial, integration on PGlite + `tests/helpers/fake-paypal.ts`; the harness clock starts at the fixed `HARNESS_EPOCH`). `TEST_DATABASE_URL` / `HARNESS_DATABASE_URL` add real-Postgres runs. Injection recall: `tests/adversarial/heldout-recall.test.ts` (never tune rules against fresh rounds; write a new one).
- `pnpm typecheck` (packages + tests/scripts), `pnpm lint` (ESLint, typed rules; web has its own config), `pnpm format` / `format:check` (Prettier, width 140), `pnpm test:coverage` (floors in `vitest.config.ts`), `pnpm test:web`, `pnpm build`.
- `pnpm test:e2e` — Playwright + axe; starts the built stack itself (`pnpm build` first, `E2E_PASSWORD`).
- `pnpm docs:api` regenerates `docs/openapi.json` + Postman from `scripts/api-routes.ts` (CI fails on drift).
- Real Postgres: `docker compose up -d`, then `HARNESS_DATABASE_URL=… pnpm vitest run tests/integration --no-file-parallelism`.
- `pnpm db:generate` after editing `packages/database/src/schema.ts` (commit the new migration).
- `pnpm --silent mcp` — stdio MCP server (`apps/mcp`, env `QM_API_URL`/`QM_EMAIL`/`QM_PASSWORD`; `--silent` keeps stdout clean); `pnpm mcp:demo` drives it against a running stack. See `docs/mcp.md`.

## Invariants — do not break

- Money is integer minor units everywhere; decimal strings only in `packages/payments/src/orders.ts`.
- `packages/trustrail` and `packages/quartermaster` stay pure (no DB, network, clock). Pass `now` in.
- Only `services/payments/` calls PayPal capture, and only after `guardCapture`. Never add a payment tool to `AGENT_TOOLS`, nor an approve/pay/refund/mandate/supplier-approval tool to `apps/mcp` (it only calls existing API routes; untrusted text goes out through `fenceUntrusted`).
- `transitionPayment` (services/payments/shared.ts) is the only writer of `payment_attempts.status`. Once PayPal returns a capture, a local failure must leave the payment CAPTURE_PENDING (never revert or report failure).
- Policy facts come from the database (`services/policy.ts`), never from agent/model output. Model output is sanitised (`sanitizeIntent`) and untrusted text is fenced (`fenceUntrusted`).
- Proposals (`purchase_orders` + items) are immutable; changes mean a new proposal. Certificates bind the cart hash.
- Payment status changes go through `canTransition` (via `transitionPayment`); finalisation must stay idempotent. Status columns are CHECK-constrained: add new values to `packages/contracts/src/enums.ts` and a migration.
- Evidence for refused operations inside a transaction must use `DeferredFailure` so it survives rollback.
- Audit appends go through `appendAudit` (hash chain); a trigger refuses UPDATE/DELETE on `audit_events`.
- Side effects (notifications) inside a transaction go through `AfterCommit`; retry only idempotent transactions with `retryOnConflict`.
- Client-facing error text is fixed per code; raw provider/driver messages stay in logs. `evaluatePolicy` must stay total (malformed input → `POLICY_INPUT_INVALID`).
- New mutating routes: `requireRole`, CSRF header is global, add `idempotent(...)` for approval/payment-like actions, add to `scripts/api-routes.ts`.
- One-time links (invitations, password resets): store only `hashToken(token)`; the token travels in the URL fragment (`#token=`). Owners may not issue reset links for owners or operators.
- Operators (system-wide error tracking) are `users.operator`, set only by `ensureOperatorAccounts` in the seed for `OPERATOR_EMAILS`; sign-up and invitations refuse those addresses.
- Server failures go to `ctx.errors.capture` (redacts messages, groups, alerts with cooldown); never throw from tracking. Browser reports without a session are warnings grouped by page.

## Layout

`apps/api/src/{http,services,services/payments,jobs,cli}` · `apps/web` · `apps/mcp` · `packages/{contracts,trustrail,quartermaster,payments,integrations,database}` · `tests/{unit,adversarial,integration,helpers}` · `docs/`.
