## Summary

<!-- What changes and why. Link the issue or audit finding. -->

## Invariants

<!-- Tick each that holds, or explain below why it does not apply. See CLAUDE.md → "Invariants". -->

- [ ] Money stays in integer minor units; decimal strings only in `packages/payments/src/orders.ts`.
- [ ] `packages/trustrail` and `packages/quartermaster` stay pure (no DB, network or clock; `now` is passed in).
- [ ] PayPal capture only in `services/payments.ts`, only after `guardCapture`; no payment tool in `AGENT_TOOLS`.
- [ ] Policy facts come from the database, never from model output; model output is sanitised and untrusted text fenced.
- [ ] Proposals stay immutable (a change is a new proposal); certificates bind the cart hash.
- [ ] Payment status changes go through `transitionPayment` (`canTransition`); finalisation stays idempotent.
- [ ] Refusals inside a transaction record evidence with `DeferredFailure`.
- [ ] Audit appends go through `appendAudit`; `audit_events` is never updated.
- [ ] New mutating routes: `requireRole`, `idempotent(...)` where approval/payment-like, entry in `scripts/api-routes.ts` (`pnpm docs:api`).
- [ ] Schema changes come with a generated migration (`pnpm db:generate`).

## Tests run

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm test` (or `pnpm test:coverage`)
- [ ] `pnpm test:web` (web changes)
- [ ] `pnpm build && pnpm test:e2e` (user-facing flows)

<!-- New behaviour has a test that fails without the change. -->
