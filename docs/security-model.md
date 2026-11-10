# TrustRail security model

TrustRail lets a business delegate purchasing to an AI agent without delegating the authority to
spend. The guiding rule: **the agent may propose anything; only deterministic code, with the
owner's signed approval of the exact cart, may move money.**

## Threats and controls

| Threat                                                               | Control                                                                                                                                                                                                                                                                                                                                                                    | Where                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Prompt injection in supplier listings, market results or invoices    | Text is normalised (NFKC, zero-width removal, homoglyphs, letter-spacing, leetspeak) and scored; sources above threshold are quarantined; untrusted text reaches the model only escaped and fenced with a random boundary; a classifier may escalate but never clear a verdict. Enforcement does **not** depend on detection.                                              | `trustrail/threat-detection`                                 |
| Agent adds a hidden fee or changes a price                           | Every line must equal a verified catalog price or a published supplier term (incl. waiver thresholds and tax rate); repeated codes, extra tax lines and unknown kinds are rejected                                                                                                                                                                                         | `evaluatePolicy`                                             |
| Agent exceeds budget or buys prohibited goods                        | Weekly/per-order/request caps, approved suppliers, allowed categories, subscriptions, over-purchase review, market-premium rule                                                                                                                                                                                                                                            | `evaluatePolicy`                                             |
| Two agents spend the same budget                                     | Reservation inside a transaction holding `SELECT … FOR UPDATE` on the budget account, plus a conditional update that fails closed                                                                                                                                                                                                                                          | `services/budget.ts`                                         |
| Cart changed after approval                                          | Certificate binds the cart hash and amount; verification recomputes the hash from stored rows at order creation and capture                                                                                                                                                                                                                                                | `certificates/certificate.ts`                                |
| Forged or replayed approval                                          | Ed25519 over a domain-separated canonical payload with nonce, expiry, key id; one payment attempt per certificate; consumed certificates cannot authorise again                                                                                                                                                                                                            | `certificates`, DB unique indexes                            |
| Owner changes the rules mid-purchase                                 | Mandates are versioned; tightening revokes pre-capture certificates and releases reservations; capture re-runs the policy                                                                                                                                                                                                                                                  | `services/mandates.ts`, `capturePayment`                     |
| Frontend claims "paid"                                               | Payment state comes only from PayPal API reads and verified webhooks; capture first reads the order from PayPal                                                                                                                                                                                                                                                            | `capturePayment`, `webhooks.ts`                              |
| PayPal order substituted or tampered                                 | Guard checks order id, status `APPROVED`, amount, currency, `custom_id` = intent, `reference_id` = PO, payee merchant                                                                                                                                                                                                                                                      | `guardCapture`                                               |
| Lost or duplicated PayPal responses                                  | Stable `PayPal-Request-Id`s; ambiguous outcomes reconcile by reading the order; monotonic state machine; idempotent finalisation                                                                                                                                                                                                                                           | `payments.ts`, `canTransition`                               |
| Forged webhooks                                                      | A guard rejects malformed headers, oversized bodies and transmission times outside ±5 minutes before any outbound call, under its own rate limit; the signature is verified via PayPal's API with a cert URL host allow-list; unverified events are never stored under their claimed id; dedupe by event id                                                                | `webhooks.ts`, `client.ts`                                   |
| Duplicate invoices                                                   | Canonical invoice numbers, content hashes, single settlement per order (partial unique index); invoices can never trigger payment                                                                                                                                                                                                                                          | `invoices/analyze.ts`                                        |
| Audit tampering                                                      | A database trigger refuses UPDATE and DELETE on `audit_events`; a per-organisation hash chain exposes edits made by anyone able to bypass the trigger, and verification reports the first broken sequence                                                                                                                                                                  | `services/audit.ts`, migration 0004                          |
| Session theft / CSRF / XSS                                           | httpOnly SameSite=Lax cookies (`__Host-` + Secure in production), SHA-256 hashed session tokens, custom-header CSRF guard, closed CORS; sign-in limited per IP + email and per IP, with an atomic lockout that answers exactly like a wrong password; nonce-based CSP with `strict-dynamic`, HSTS and a same-origin post-login redirect                                    | `http/`, `apps/web/proxy.ts`                                 |
| Privilege misuse                                                     | OWNER-only approval, payment, refund and mandate edits (`403 ROLE_REQUIRED`); only the approving owner may pay                                                                                                                                                                                                                                                             | `requireRole`, guard `BUYER_MISMATCH`                        |
| Takeover or defacement of the shared sample workspace                | The seed flags it (`organizations.is_sample`, never found by name); password, team, reset-link, mandate, supplier and catalog changes are refused with `403 SAMPLE_WORKSPACE_READONLY`; its published accounts are exempt from the account lockout and get no reset emails; research limits key on user + client address; optional nightly reset (`SAMPLE_RESET_HOUR_UTC`) | `middleware/auth.ts`, `sample-workspace.ts`                  |
| Spoofed `X-Forwarded-For` defeats per-IP limits                      | With `EDGE_SECRET`, forwarded addresses are believed only on requests carrying the web proxy's `X-QM-Edge` secret (constant-time compare); everyone else is keyed on the socket peer                                                                                                                                                                                       | `middleware/edge.ts`, `apps/web/proxy.ts`                    |
| Runaway OpenAI / Channel3 spend                                      | Daily per-organisation and platform-wide caps on research runs and model tokens (atomic counters); beyond them research runs on the labelled deterministic fallback and operators get one warning per cap per day; red-team runs and webhook verifications have their own per-user, per-workspace and global limits                                                        | `usage.ts`, `routes/operations.ts`, `middleware/webhooks.ts` |
| Account abuse (guessing, lockout DoS, enumeration, phishing invites) | Common and derived passwords refused on every set path; failures from addresses a user has signed in from do not count towards the lockout and those addresses are not locked out; invitations to existing accounts look like any other but are inert; invitations limited per workspace; link-shaped names refused; idle sessions end after `SESSION_IDLE_MINUTES`        | `password-strength.ts`, `services/auth.ts`, `accounts/`      |
| Payment state corrupted by races or bugs                             | `transitionPayment` is the only writer of payment status (compare-and-set over the forward-only state machine); statuses and money invariants are CHECK constraints; a local failure after PayPal captured leaves the payment CAPTURE_PENDING for reconciliation, never "failed"; reversals and pending refunds are tracked                                                | `services/payments/`, migration 0003                         |
| Malformed facts reach the policy engine                              | `evaluatePolicy` is total: malformed input is a BLOCK with `POLICY_INPUT_INVALID`, never an exception; the decision digest binds every input (catalog, terms, prior orders, clock)                                                                                                                                                                                         | `evaluatePolicy`                                             |

## Intent Certificate

```json
{
  "certificate_version": 1,
  "intent_id": "…",
  "organization_id": "…",
  "buyer_id": "…",
  "purchase_order_id": "…",
  "supplier_id": "…",
  "cart_hash": "sha256:…",
  "mandate_id": "…",
  "mandate_version": 3,
  "policy_decision_id": "…",
  "currency": "USD",
  "approved_amount_minor": 17320,
  "approved_at": "2026-11-10T18:00:00.000Z",
  "expires_at": "2026-11-10T18:30:00.000Z",
  "nonce": "32 hex chars",
  "key_id": "trk_…"
}
```

Signing input: `"trustrail.intent-certificate.v1\n" + canonical_json(payload)`, Ed25519, base64url.
Canonical JSON sorts keys, forbids floats and non-plain objects, and omits `undefined`. Public keys
are stored in `signing_keys` so certificates remain verifiable after key rotation. Verification
statuses: `VALID`, `EXPIRED`, `CART_MODIFIED`, `SIGNATURE_INVALID`, `UNKNOWN_KEY`, `MANDATE_CHANGED`,
`REVOKED`, `CONSUMED`, `PAYLOAD_MISMATCH`. Unknown stored states fail closed.

## Policy decisions

`ALLOW`, `REVIEW_REQUIRED` (owner must tick each REVIEW code) or `BLOCK`. For this release
`human_approval_required` is always true for payments. Each decision records the mandate version,
the policy version (`trustrail-policy/1.4.0`) and a digest of the exact facts evaluated.

## Key management

Generate with `pnpm keys:generate`; store `TRUSTRAIL_SIGNING_KEY` only in the secret manager.
Rotate by deploying a new key id — old public keys stay in `signing_keys`. In development an
ephemeral key is used (with a warning); production refuses to start without a configured key.

## Known limits

- Detection is heuristic; a novel phrasing may evade it. That is acceptable only because detection is
  not an enforcement mechanism — the cart is still evaluated line by line.
- Market-price checks are only as good as listing normalisation; uncertain listings are excluded and
  the line is routed to human review rather than auto-decided.
- PayPal webhook verification uses PayPal's verification API (network dependency); while PayPal is
  unreachable webhooks are answered with 503 so PayPal retries.
- The audit trigger stops application bugs and ordinary database users; a database superuser can
  still disable it. The hash chain is what detects such edits, so verify it routinely.
- The CSP allows inline styles because AG Grid and AG Charts inject style elements at runtime;
  scripts are nonce-only.
