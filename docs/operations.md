# Operations runbook

## Services

| Service                     | Command                                                                                 | Health                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| API (also runs the sweeper) | `node --max-old-space-size=384 --enable-source-maps apps/api/dist/server.js`            | `GET /healthz` (liveness), `GET /readyz` (database within 2 s, sweeper liveness; 503 while draining)        |
| Web                         | `node --max-old-space-size=384 apps/web/node_modules/next/dist/bin/next start apps/web` | `GET /login`                                                                                                |
| Sweeper (optional cron)     | `node apps/api/dist/sweep.js`                                                           | logs `sweep complete` with counts                                                                           |
| Pre-deploy                  | `node apps/api/dist/migrate.js && node apps/api/dist/seed.js`                           | exits 0; migrations under an advisory lock, then the sample workspace and operators if missing (idempotent) |

`render.yaml` describes the live deployment: web and API on Starter instances, Postgres on a paid
plan, and the sweeper inside the API (`SWEEPER_INTERVAL_SECONDS=120`). Start commands are one
`node` process each (no `sh -c "… && …"`), so Render's SIGTERM reaches the server and it drains.
Memory flags sit on the start commands, not in `NODE_OPTIONS`, which Render also applies to builds.

All logs are structured JSON (pino). Every line written while handling a request carries
`correlation_id`, `organization_id` and `user_id`; every API response carries `x-correlation-id`, and
the same id is stored on audit events, so a support request can be traced from HTTP request to audit
trail. Model fallbacks log `openai.fallback` with an error kind (never prompt text).

On SIGTERM the API answers `/readyz` with 503 (`draining`), stops accepting connections, waits up to
`SHUTDOWN_GRACE_MS` (60 s) for in-flight requests and a running sweep, then closes the database.
`maxShutdownDelaySeconds: 90` gives it that long before Render kills the process. Uncaught exceptions and unhandled rejections
are logged as fatal, drained the same way, and exit non-zero so the platform restarts the process.

The sweeper also fails research runs abandoned by a crashed or redeployed process (status `FAILED`,
"Research was interrupted") and keeps checking recently voided payments for late PayPal captures.

## First deployment on Render

1. Push the repository and create a Blueprint from `render.yaml`.
2. In the dashboard set the `sync: false` secrets: `TRUSTRAIL_SIGNING_KEY(_ID)` (from
   `pnpm keys:generate`), PayPal sandbox credentials, `APP_BASE_URL` (required in production: links
   in emails and alerts use it), optional Channel3/OpenAI/Zapier keys, `RESEND_API_KEY` and
   `EMAIL_FROM` (a sender on a domain verified in Resend), and `DEMO_USER_PASSWORD` (the pre-deploy
   seed needs it). A separate sweeper cron must use the **same** signing key as the API.
3. In the PayPal developer dashboard add a webhook to `https://<api-host>/api/v1/webhooks/paypal`
   for `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`,
   `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`,
   `PAYMENT.CAPTURE.REVERSED`; copy its id to `PAYPAL_WEBHOOK_ID`.
4. The pre-deploy command migrates and seeds; no shell step is needed.
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

## Migrations and rollback

- Production migrates only in the pre-deploy command (`MIGRATE_ON_BOOT` defaults to `false` when
  `NODE_ENV=production`, `true` elsewhere). A host without a pre-deploy hook (plain Docker) must run
  `node dist/migrate.js` first or set `MIGRATE_ON_BOOT=true`.
- Every migrator takes the PostgreSQL advisory lock `72411093157` on its own connection, so a
  pre-deploy step and a booting instance (or two instances) apply migrations one after the other.
- Migrations are forward-only and written to be backward compatible with the previous release
  (add columns/tables; never drop or rename in the same release). If a pre-deploy migration fails the
  deploy stops and the previous release keeps serving. To roll back code, redeploy the previous
  commit (Render → Deploys → Rollback); the newer schema stays and the older code ignores it. Only a
  destructive mistake needs a database restore (below).

## Notifications

- Workspace notifications (approval needed, purchase blocked, payment completed, invoice held,
  delivery delayed) go to `NOTIFY_CHANNEL`: `zapier` (the Catch Hook), `email` (each workspace's
  enabled owners, up to five, through Resend) or `both`. Unset, it is `both` with `RESEND_API_KEY` and
  `ZAPIER_WEBHOOK_URL`, `email` with only the Resend key, otherwise `zapier`. The shared sample
  workspace's accounts, removed members and reserved test domains are never mailed.
- A failed delivery (a lapsed Zapier plan, a rejected sending domain) is recorded as one warning group
  per channel, `NOTIFY_FAILED`, on the System page; notifications never block or fail the action.

## Sweeper liveness and uptime checks

- Each successful sweep records its time. `GET /readyz` reports `sweeper` (`ok`, `stale`, `unknown`)
  and `last_sweep_age_seconds`, and the API checks it every few minutes: `monitor.sweeper_stale`
  alerts once no sweep has succeeded for `SWEEPER_STALE_AFTER_SECONDS` (default 3 × the interval;
  15 minutes for a 5-minute cron; `0` disables) and resolves itself when sweeps resume. A stale
  sweeper never fails the probe, so Render does not restart a healthy API for it.
- External uptime check (UptimeRobot or Better Stack, free): a keyword monitor on
  `https://<api-host>/readyz` every 5 minutes that alerts when the response is not 200 **or** contains
  `"sweeper":"stale"`, plus an HTTP monitor on `https://<web-host>/login`. This catches the case the
  in-app alerts cannot: the whole API being down.

## Outbound resilience

- OpenAI and Channel3 calls sit behind a circuit breaker: after `PROVIDER_BREAKER_THRESHOLD` (3)
  consecutive provider failures (network, timeout, 429, 5xx) calls are skipped for
  `PROVIDER_BREAKER_COOLDOWN_SECONDS` (120) and research uses its deterministic fallback and cached
  listings at once (labelled in the agent steps); one trial call then decides whether to close it.
  Logs: `openai.circuit_open` / `channel3.circuit_open`.
- PayPal reads, and writes carrying a `PayPal-Request-Id` (create, capture, refund), are retried once
  after a 429 or 5xx with a jittered delay (`paypal.retry` in the logs); PayPal replays the original
  outcome for a repeated request id. Webhook verification and network errors are never retried here:
  ambiguous outcomes go through reconciliation.
- The web proxy waits up to 120 s for the API (`experimental.proxyTimeout`), longer than a research
  run. The analytics summary is cached per workspace for `ANALYTICS_CACHE_SECONDS` (30).

## Retention

The sweeper deletes, in batches, records older than `RETENTION_DAYS` (90): PayPal webhook events,
agent tool steps (the run rows stay), error groups not seen since, and invitations and password-reset
links that expired unused. It never deletes audit events, payments, orders, certificates, policy
decisions, findings or workspaces (a workspace's audit chain is immutable).

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

Render Postgres provides daily backups on paid plans, and point-in-time recovery on plans that offer
it.

- **RPO** (data that can be lost): up to 24 hours with daily backups; minutes with point-in-time
  recovery. **RTO** (time to restore service): about 30–60 minutes for a 1 GB database (restore,
  repoint `DATABASE_URL`, redeploy, verify).
- **Restore drill** (run before judging and after any schema change): in the Render dashboard restore
  the latest backup (or a point in time) into a **new** database; point a temporary API service, or
  `DATABASE_URL` locally, at it; run `node apps/api/dist/migrate.js`; then check
  `GET /api/v1/security/audit/verify` returns `valid: true` for the sample workspace,
  `security.duplicate_captures` is `0`, and the latest orders are present. Record the time taken.
  Delete the drill database afterwards.
- A real restore: restore into a new database, set the API's `DATABASE_URL` to it, redeploy, run the
  routine checks below, then retire the old database. The sweeper reconciles any payment PayPal
  completed after the restore point the next time it runs (it reads PayPal, never the backup).
  `audit_events` is append-only (a trigger refuses
  UPDATE and DELETE) and hash-chained; verification reports the first altered sequence. Deleting an
  organisation requires `select set_config('qm.allow_audit_purge', 'on', true)` in the same transaction. `.tmp/` and
  `.data/` are disposable local state.

## Release process

1. Merge to `main` only with CI green (typecheck, lint, format, unit + integration on PGlite and
   PostgreSQL, web tests, build, e2e). Render deploys only after checks pass
   (`autoDeployTrigger: checksPass`).
2. Add the CHANGELOG entry, then tag the release: `git tag -a judging-2026-11-12 -m "Judging build"`
   and `git push origin judging-2026-11-12`.
3. During judging turn auto-deploy **off** on both services (Render → Settings → Auto-Deploy: No) so
   only deliberate deploys reach judges; deploy a hotfix by hand from its commit and re-tag.
4. After each deploy: `GET /readyz` is `ready` with `"sweeper":"ok"` within a few minutes, sign in to
   the sample workspace, and check the System page has no new error groups.

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
