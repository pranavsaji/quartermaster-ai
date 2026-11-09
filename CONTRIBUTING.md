# Contributing

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env            # fill in DEMO_USER_PASSWORD (12+ characters)
pnpm keys:generate              # TrustRail signing key → paste into .env
pnpm db:seed                    # embedded PGlite under .data/ unless DATABASE_URL is set
pnpm dev                        # API :4000, web :3000
```

## Before you push

```bash
pnpm typecheck    # all packages, plus tests and scripts
pnpm lint         # ESLint (typed rules) for every package
pnpm format:check # Prettier
pnpm test         # unit, adversarial and integration (PGlite + fake PayPal)
pnpm build
pnpm test:e2e     # Playwright; starts the built stack itself (needs E2E_PASSWORD)
```

CI runs all of these, plus the integration suite against PostgreSQL 17, a dependency audit and
CodeQL. Coverage floors are enforced (`vitest.config.ts`); do not lower them.

## Rules that keep the system safe

Read [`CLAUDE.md`](CLAUDE.md) → "Invariants". In short:

- money is integer minor units everywhere;
- `packages/trustrail` and `packages/quartermaster` stay pure (no DB, network or clock);
- only `services/payments` calls PayPal capture, only after `guardCapture`, and every payment
  status change goes through `transitionPayment`, which enforces `canTransition` (plus a few
  named exceptions) and applies the change only if the row is still in the expected state;
- proposals are immutable, certificates bind the cart hash, the audit log is append-only;
- new mutating routes need `requireRole`, `idempotent(...)` for approval or payment-like
  actions, and an entry in `scripts/api-routes.ts` (then `pnpm docs:api`).

## Database changes

Edit `packages/database/src/schema.ts`, run `pnpm db:generate`, and commit the migration. Status
columns are typed and constrained; add new values to `packages/contracts/src/enums.ts` first.

## Commits

Small, focused commits with conventional prefixes (`feat`, `fix`, `refactor`, `test`, `docs`,
`build`, `ci`, `perf`). Each behaviour change ships with its test.
