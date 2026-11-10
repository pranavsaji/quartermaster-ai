# Operations runbook

## Services

| Service                     | Command                                           | Health                                                                                    |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| API                         | `node apps/api/dist/server.js`                    | `GET /healthz` (liveness), `GET /readyz` (database; integration flags outside production) |
| Web                         | `pnpm --filter @qm/web start`                     | `GET /login`                                                                              |
| Sweeper (cron, every 5 min) | `node apps/api/dist/sweep.js`                     | logs `sweep complete` with counts                                                         |
| Migrations (pre-deploy)     | `node apps/api/dist/migrate.js`                   | exits 0                                                                                   |
| Sample workspace (once)     | `DEMO_USER_PASSWORD=… node apps/api/dist/seed.js` | logs `demo seed`; idempotent, never resets without `--reset`                              |

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
   `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`,
   `PAYMENT.CAPTURE.REVERSED`; copy its id to `PAYPAL_WEBHOOK_ID`.
4. Open a shell on the API service and run the seed command once.
5. Check `GET /readyz` returns `ready`, sign in as the demo owner, and confirm the header shows PayPal as
   enabled (`GET /api/v1/config/public`).

Production refuses to boot when PayPal is configured without `PAYPAL_WEBHOOK_ID` and
`PAYPAL_MERCHANT_ID`, or with `DATABASE_SSL=disable` (unless `DATABASE_ALLOW_INSECURE_TRANSPORT=true`
for a private network). Synthetic delivery actions default to off in production. Render deploys only
after CI passes (`autoDeployTrigger: checksPass`). A Dockerfile builds the same API for other hosts.

Choose a paid Postgres plan: the judging window extends beyond a free database's lifetime.

### Free-plan variant

Render's free instances have no pre-deploy command, shell or cron jobs, and cannot receive
private-network traffic, so a free deployment differs from `render.yaml`:

- **Database:** `plan: free` Postgres (one per workspace; expires 30 days after creation, deleted 14
  days later unless upgraded).
- **API:** start command `node apps/api/dist/seed.js && node apps/api/dist/server.js`. Every boot
  migrates and creates the shared sample workspace only if it is missing; data persists across
  restarts and deploys. Set `SWEEPER_INTERVAL_SECONDS=120` so the API runs the sweeper (and the health
  monitors) itself, since free instances have no cron jobs.
- **Web:** set `API_URL=https://<api-host>` (public URL) instead of `API_HOSTPORT`. It is read at build
  time, so redeploy the web service after changing it. The API then sits behind two edge hops:
  `TRUST_PROXY=3`.
- Free services sleep after 15 idle minutes; the first request after that takes about a minute, and
  the sweeper only runs while the API is awake.

## Accounts

- **Sign-up** (`/signup`) creates a workspace, its first owner and Spend Mandate v1 (no suppliers
  approved; restricted categories off), optionally with labelled sample data. Turn it off with
  `SIGNUP_ENABLED=false`; owners can still invite people.
- **Invitations and resets** are one-time links. Only a SHA-256 of each token is stored and the token
  travels in the URL fragment, so it never reaches access logs. With `RESEND_API_KEY` (or
  `EMAIL_WEBHOOK_URL`) they are emailed; without email, owners copy them from the Team page and
  "Forgot password" is hidden. A reset clears any lockout and ends every session of that user.
- An account belongs to one workspace. Removing a member ends their sessions, disables the account and
  releases the address (renamed to a reserved `.invalid` address) so they can be invited again; their
  orders and audit history keep pointing at the original user row.

## Error tracking and alerting

- 5xx responses, crashes (`uncaughtException`/`unhandledRejection`), sweeper failures and browser
  errors (`POST /api/v1/client-errors`) are grouped by fingerprint in `system_errors` with counts,
  first/last seen and the last correlation id (search the logs for it).
- Operators (`OPERATOR_EMAILS`) see them on the **System** page with platform health, can resolve a
  group, and can send a test alert. Workspace owners never see platform errors.
- An error-level group alerts on its first occurrence, when it recurs after being resolved, and when
  new occurrences arrive after `ALERT_COOLDOWN_MINUTES` (30). Each alert is claimed with one conditional
  update, so instances never double-send. Warnings (retryable 503s, lock conflicts) are recorded only.
- Channels: `ALERT_EMAILS` (needs email), `ALERT_WEBHOOK_URL` (Slack-compatible `{ text }`; the payload
  also carries `title`/`summary`/`link`, so a Zapier Catch Hook can email it), and `SENTRY_DSN`.
- Monitors run with every sweep and resolve themselves when the condition clears:
  `monitor.capture_pending` (a capture pending over 15 minutes), `monitor.paypal_webhook_missing` (a
  completed payment with no verified PayPal notification after 30 minutes: check the webhook URL and
  `PAYPAL_WEBHOOK_ID`) and `monitor.webhook_signatures` (3+ rejected signatures in an hour).
- Each workspace's **Security center** shows its own PayPal notification status.

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

## Error codes worth knowing

Every error response is `{ error: { code, message, details?, correlation_id } }`. Messages are fixed per
code; provider and database text stays in the logs.

| Code                                               | Status  | Meaning and what to do                                                                   |
| -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `ROLE_REQUIRED`                                    | 403     | The signed-in role is too low (`details.required_role`).                                 |
| `REQUEST_NOT_APPROVABLE`, `RESEARCH_IN_PROGRESS`   | 409     | The request is not ready for review (or research is running). Refresh and retry.         |
| `PROPOSAL_NOT_OPEN`                                | 409     | That proposal was already approved, rejected or superseded.                              |
| `AGENT_DEADLINE_EXCEEDED`, `AGENT_BUDGET_EXCEEDED` | 503     | Research ran out of time or tool budget; retry after `Retry-After`.                      |
| `CAPTURE_REFUSED`                                  | 422     | TrustRail refused the capture; see the finding and the recorded CAPTURE policy decision. |
| `INSTRUMENT_DECLINED`, `PAYPAL_CAPTURE_REJECTED`   | 422     | PayPal refused; nothing was charged and the buyer can pay again (`details.restart`).     |
| `PAYPAL_ORDER_MISMATCH`                            | 502     | PayPal's order did not match the approval; the attempt was voided and a finding raised.  |
| `PAYPAL_REFUND_UNCONFIRMED`                        | 502     | Outcome unknown. Retry with the same Idempotency-Key, or the sweeper resolves it.        |
| `REFUND_DECLINED` / `REFUND_CLOSED`                | 422/409 | PayPal declined the refund; start a new refund (with a new key).                         |
| `REFUND_IN_PROGRESS`                               | 409     | Another refund on that payment is unresolved; retry it or wait for the sweeper.          |
| `WEBHOOK_MALFORMED`, `WEBHOOK_STALE`               | 400     | Rejected before contacting PayPal (bad headers or clock skew beyond ±5 minutes).         |
| `RATE_LIMITED`                                     | 429     | Per-IP or per-account limit; counters are shared across instances in production.         |

## Signing key ids

`pnpm keys:generate` now derives the key id from the SHA-256 of the DER public key (`trk_` + 16 hex).
Deployments that relied on an earlier default id should keep it by setting `TRUSTRAIL_SIGNING_KEY_ID`
explicitly; certificates signed under older ids still verify because public keys are kept in
`signing_keys`.
