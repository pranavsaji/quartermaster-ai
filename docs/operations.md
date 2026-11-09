# Operations runbook

## Services

| Service                     | Command                                           | Health                                                                  |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| API                         | `node apps/api/dist/server.js`                    | `GET /healthz` (liveness), `GET /readyz` (database + integration flags) |
| Web                         | `pnpm --filter @qm/web start`                     | `GET /login`                                                            |
| Sweeper (cron, every 5 min) | `node apps/api/dist/sweep.js`                     | logs `sweep complete` with counts                                       |
| Migrations (pre-deploy)     | `node apps/api/dist/migrate.js`                   | exits 0                                                                 |
| Demo seed (once)            | `DEMO_USER_PASSWORD=… node apps/api/dist/seed.js` | logs `demo seed`                                                        |

All logs are structured JSON (pino). Every line written while handling a request carries
`correlation_id`, `organization_id` and `user_id`; every API response carries `x-correlation-id`, and
the same id is stored on audit events, so a support request can be traced from HTTP request to audit
trail. Model fallbacks log `openai.fallback` with an error kind (never prompt text).

On SIGTERM the API stops accepting connections, waits up to `SHUTDOWN_GRACE_MS` (60 s) for in-flight
requests and a running sweep, then closes the database. Uncaught exceptions and unhandled rejections
are logged as fatal, drained the same way, and exit non-zero so the platform restarts the process.

The sweeper also fails research runs abandoned by a crashed or redeployed process (status `FAILED`,
"Research was interrupted") and keeps checking recently voided payments for late PayPal captures.

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

Production refuses to boot when PayPal is configured without `PAYPAL_WEBHOOK_ID` and
`PAYPAL_MERCHANT_ID`, or with `DATABASE_SSL=disable` (unless `DATABASE_ALLOW_INSECURE_TRANSPORT=true`
for a private network). Synthetic delivery actions default to off in production. Render deploys only
after CI passes (`autoDeployTrigger: checksPass`). A Dockerfile builds the same API for other hosts.

Choose a paid Postgres plan: the judging window extends beyond a free database's lifetime.

## Routine checks

- `GET /api/v1/security/audit/verify` must return `valid: true`.
- `GET /api/v1/analytics/summary` → `security.duplicate_captures` must be `0`.
- Payments stuck in `CAPTURE_PENDING` for more than a few minutes indicate PayPal connectivity
  problems; the sweeper reconciles them automatically once PayPal is reachable.

## Incident playbooks

**PayPal capture timed out / user saw an error after paying.** Do nothing destructive. The payment is
`CAPTURE_PENDING`; the next sweep (or the user retrying "Pay") reads the order from PayPal and
finalises it. Never create a new order for the same intent — the API will refuse to anyway.

**Webhooks answered 400 `WEBHOOK_STALE` / `WEBHOOK_MALFORMED`, 413 or 429.** The guard rejected the
delivery before contacting PayPal: check the server clock (transmission time must be within ±5
minutes) and `WEBHOOK_RATE_LIMIT_PER_MINUTE`. PayPal retries rejected deliveries.

**Webhook signature failures in Security Center.** Confirm `PAYPAL_WEBHOOK_ID` matches the webhook
configured for this environment's app. Repeated failures from unknown sources are rejected and
rate-limited; no state changes occur.

**Security Center shows "PayPal reversed a captured payment".** A chargeback or reversal moved money
back to the buyer. The payment's refunded amount and the week's spend were adjusted; follow up with
the supplier.

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

Render Postgres provides daily backups on paid plans. `audit_events` is append-only (a trigger refuses
UPDATE and DELETE) and hash-chained; verification reports the first altered sequence. Deleting an
organisation requires `select set_config('qm.allow_audit_purge', 'on', true)` in the same transaction. `.tmp/` and
`.data/` are disposable local state.
