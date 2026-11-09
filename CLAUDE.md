# Quartermaster AI + TrustRail — repository guide

pnpm monorepo, TypeScript (strict, ESM, `moduleResolution: Bundler`). Node ≥ 22.12.

## Commands

- `pnpm dev` — API (:4000, tsx watch) + web (:3000). Needs `.env` (see `.env.example`); `pnpm keys:generate` for the signing key.
- `pnpm db:seed` — migrate + seed demo org (needs `DEMO_USER_PASSWORD`). Embedded PGlite under `.data/` unless `DATABASE_URL` is set.
- `pnpm test` — Vitest (unit, adversarial, integration on PGlite + `tests/helpers/fake-paypal.ts`). `TEST_DATABASE_URL` / `HARNESS_DATABASE_URL` add real-Postgres runs.
- `pnpm typecheck`, `pnpm build`, `pnpm docs:api` (regenerates `docs/openapi.json` + Postman from `scripts/api-routes.ts`).
- `pnpm db:generate` after editing `packages/database/src/schema.ts` (commit the new migration).

## Invariants — do not break

- Money is integer minor units everywhere; decimal strings only in `packages/payments/src/orders.ts`.
- `packages/trustrail` and `packages/quartermaster` stay pure (no DB, network, clock). Pass `now` in.
- Only `services/payments.ts` calls PayPal capture, and only after `guardCapture`. Never add a payment tool to `AGENT_TOOLS`.
- Policy facts come from the database (`services/policy.ts`), never from agent/model output. Model output is sanitised (`sanitizeIntent`) and untrusted text is fenced (`fenceUntrusted`).
- Proposals (`purchase_orders` + items) are immutable; changes mean a new proposal. Certificates bind the cart hash.
- Payment status changes go through `canTransition`; finalisation must stay idempotent.
- Evidence for refused operations inside a transaction must use `DeferredFailure` so it survives rollback.
- Audit appends go through `appendAudit` (hash chain); never update `audit_events`.
- New mutating routes: `requireRole`, CSRF header is global, add `idempotent(...)` for approval/payment-like actions, add to `scripts/api-routes.ts`.

## Layout

`apps/api/src/{http,services,jobs,cli}` · `apps/web` · `packages/{contracts,trustrail,quartermaster,payments,integrations,database}` · `tests/{unit,adversarial,integration,helpers}` · `docs/`.
