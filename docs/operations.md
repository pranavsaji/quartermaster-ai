# Operations runbook

## Services

| Service | Command | Health |
|---|---|---|
| API | `node apps/api/dist/server.js` | `GET /healthz` (liveness), `GET /readyz` (database + integration flags) |
| Web | `pnpm --filter @qm/web start` | `GET /login` |
| Sweeper (cron, every 5 min) | `node apps/api/dist/sweep.js` | logs `sweep complete` with counts |
| Migrations (pre-deploy) | `node apps/api/dist/migrate.js` | exits 0 |
| Demo seed (once) | `DEMO_USER_PASSWORD=… node apps/api/dist/seed.js` | logs `demo seed` |

All logs are structured JSON (pino) with `correlation_id`. Every API response carries
`x-correlation-id`; the same id is stored on audit events, so a support request can be traced from
HTTP request to audit trail.

## First deployment on Render

1. Push the repository and create a Blueprint from `render.yaml`.
2. In the dashboard set the `sync: false` secrets: `TRUSTRAIL_SIGNING_KEY(_ID)` (from
   `pnpm keys:generate`), PayPal sandbox credentials, `APP_BASE_URL`, optional Channel3/OpenAI/Zapier
   keys and `DEMO_USER_PASSWORD`. Use the **same** signing key on the API and the sweeper.
3. In the PayPal developer dashboard add a webhook to `https://<api-host>/api/v1/webhooks/paypal`
   for `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`,
   `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`; copy its id to
   `PAYPAL_WEBHOOK_ID`.
4. Open a shell on the API service and run the seed command once.
5. Check `GET /readyz` reports `paypal: true` and sign in as the demo owner.

Choose a paid Postgres plan: the judging window extends beyond a free database's lifetime.

## Routine checks

* `GET /api/v1/security/audit/verify` must return `valid: true`.
* `GET /api/v1/analytics/summary` → `security.duplicate_captures` must be `0`.
* Payments stuck in `CAPTURE_PENDING` for more than a few minutes indicate PayPal connectivity
  problems; the sweeper reconciles them automatically once PayPal is reachable.

## Incident playbooks

**PayPal capture timed out / user saw an error after paying.** Do nothing destructive. The payment is
`CAPTURE_PENDING`; the next sweep (or the user retrying "Pay") reads the order from PayPal and
finalises it. Never create a new order for the same intent — the API will refuse to anyway.

**Webhook signature failures in Security Center.** Confirm `PAYPAL_WEBHOOK_ID` matches the webhook
configured for this environment's app. Repeated failures from unknown sources are rejected and
rate-limited; no state changes occur.

**Budget looks wrong.** Reservations are visible in `budget_reservations`. ACTIVE reservations for
expired certificates are released by the sweeper after it confirms with PayPal that no capture
happened. Refunds reduce `spent_minor`.

**Owner tightened the mandate and an approved order disappeared.** Expected: tightening revokes
pre-capture certificates (`certificate.revoked` audit events, reason `MANDATE_CHANGED`) and returns
the proposal to review. Re-evaluate and re-approve.

**Signing key compromise.** Generate a new key with a new key id, deploy it, and revoke ACTIVE
certificates (they are short-lived — 30 minutes by default). Public keys of old certificates stay in
`signing_keys` for historical verification; mark the compromised key `retired_at`.

## Backups and data

Render Postgres provides daily backups on paid plans. `audit_events` is append-only by convention and
hash-chained; do not edit rows (verification will report the first altered sequence). `.tmp/` and
`.data/` are disposable local state.
