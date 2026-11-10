# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Operations

- The web proxy waits up to 120 s for the API (`experimental.proxyTimeout`; Next's default of 30 s cut
  off research runs).
- Notifications can go by email to each workspace's owners (`NOTIFY_CHANNEL=zapier|email|both`), and
  failed deliveries are tracked as a `NOTIFY_FAILED` warning group. `APP_BASE_URL` is required in
  production.
- Sweeper liveness: `/readyz` reports the last sweep's age and `monitor.sweeper_stale` alerts when
  sweeps stop. `/readyz` answers 503 while draining and bounds its database check at 2 s.
- `render.yaml` matches the live Starter deployment: pre-deploy migrate + seed, single-process start
  commands, `maxShutdownDelaySeconds: 90`, memory flags, the sweeper inside the API.
- Production no longer migrates on boot (`MIGRATE_ON_BOOT`); migrations take a PostgreSQL advisory lock.
- Circuit breaker for OpenAI and Channel3 (3 failures → 120 s of immediate deterministic fallback); one
  jittered retry of idempotent PayPal calls on 429/5xx.
- Retention: the sweeper purges webhook events, agent tool steps, stale error groups and expired
  one-time links after `RETENTION_DAYS` (90); evidence is never purged.
- Faster request detail and analytics (independent reads run concurrently; the summary is cached 30 s
  per workspace). The Bryntum module is served from a versioned, immutable URL.
- CI builds the MCP server. The operations runbook covers rollback, backups (RPO/RTO and a restore
  drill), uptime checks and the release process.

Hardening after the November 2026 audit of the domain packages and test suite.

### Security

- Prompt-injection detection generalises by attack family (overrides with more verbs and
  objects, claimed owner approval, disabled controls, role-play, output steering, payment-detail
  changes, eleven non-English languages) and decodes HTML entities, percent-escapes, short base64,
  ROT13 and reversed text before matching. Product instructions ("delivery instructions printed on
  the box") are only deferred, and count as soon as any other signal is present.
- `evaluatePolicy` blocks facts of the wrong type (`POLICY_INPUT_INVALID`) instead of coercing them:
  a string quarantine list, `"false"` for a boolean or a numeric string can no longer produce ALLOW.
- `verifyCertificate` is total: malformed envelopes or payloads yield `PAYLOAD_MISMATCH`.
- Signing-key fingerprints hash the DER public key; ids derived from the PEM text are still accepted.

### Fixed

- Untrusted text is fenced as written (no homoglyph folding or letter-spacing collapse).
- The budget is read from the amount a cap cue marks ("the $30 gloves, keep it under $500" → $500).
- Demand words count only about a period of trade and honour negation ("slow cooker liners",
  "not busy this week" are normal demand); the interpreter clamps to the 0.25–4 range the API accepts.
- Items sharing an offer share one cart line; budget trimming keeps lines by identity.
- Invoice numbers treat "No."/"Number" before the digits as a label (normalisation v3), and an
  invoice analysed against an order it does not reference is a discrepancy.
- The pure-package lint rule also forbids `Date()` without `new`.

### Tests

- A held-out prompt-injection corpus written before tuning, two fresh rounds, and a recall test
  that reports every miss; type-confusion totality properties for the policy engine and
  certificate verification; the integration harness clock starts at a fixed instant.

### Documentation

- README figures are the measured ones; CODEOWNERS, a pull-request template and this changelog.
