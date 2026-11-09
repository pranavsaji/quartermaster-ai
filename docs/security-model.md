# TrustRail security model

TrustRail lets a business delegate purchasing to an AI agent without delegating the authority to
spend. The guiding rule: **the agent may propose anything; only deterministic code, with the
owner's signed approval of the exact cart, may move money.**

## Threats and controls

| Threat                                                            | Control                                                                                                                                                                                                                                                                                                                       | Where                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Prompt injection in supplier listings, market results or invoices | Text is normalised (NFKC, zero-width removal, homoglyphs, letter-spacing, leetspeak) and scored; sources above threshold are quarantined; untrusted text reaches the model only escaped and fenced with a random boundary; a classifier may escalate but never clear a verdict. Enforcement does **not** depend on detection. | `trustrail/threat-detection`             |
| Agent adds a hidden fee or changes a price                        | Every line must equal a verified catalog price or a published supplier term (incl. waiver thresholds and tax rate); repeated codes, extra tax lines and unknown kinds are rejected                                                                                                                                            | `evaluatePolicy`                         |
| Agent exceeds budget or buys prohibited goods                     | Weekly/per-order/request caps, approved suppliers, allowed categories, subscriptions, over-purchase review, market-premium rule                                                                                                                                                                                               | `evaluatePolicy`                         |
| Two agents spend the same budget                                  | Reservation inside a transaction holding `SELECT … FOR UPDATE` on the budget account, plus a conditional update that fails closed                                                                                                                                                                                             | `services/budget.ts`                     |
| Cart changed after approval                                       | Certificate binds the cart hash and amount; verification recomputes the hash from stored rows at order creation and capture                                                                                                                                                                                                   | `certificates/certificate.ts`            |
| Forged or replayed approval                                       | Ed25519 over a domain-separated canonical payload with nonce, expiry, key id; one payment attempt per certificate; consumed certificates cannot authorise again                                                                                                                                                               | `certificates`, DB unique indexes        |
| Owner changes the rules mid-purchase                              | Mandates are versioned; tightening revokes pre-capture certificates and releases reservations; capture re-runs the policy                                                                                                                                                                                                     | `services/mandates.ts`, `capturePayment` |
| Frontend claims "paid"                                            | Payment state comes only from PayPal API reads and verified webhooks; capture first reads the order from PayPal                                                                                                                                                                                                               | `capturePayment`, `webhooks.ts`          |
| PayPal order substituted or tampered                              | Guard checks order id, status `APPROVED`, amount, currency, `custom_id` = intent, `reference_id` = PO, payee merchant                                                                                                                                                                                                         | `guardCapture`                           |
| Lost or duplicated PayPal responses                               | Stable `PayPal-Request-Id`s; ambiguous outcomes reconcile by reading the order; monotonic state machine; idempotent finalisation                                                                                                                                                                                              | `payments.ts`, `canTransition`           |
| Forged webhooks                                                   | Signature verified via PayPal's API, cert URL host allow-list, unverified events never stored under their claimed id, dedupe by event id                                                                                                                                                                                      | `webhooks.ts`, `client.ts`               |
| Duplicate invoices                                                | Canonical invoice numbers, content hashes, single settlement per order (partial unique index); invoices can never trigger payment                                                                                                                                                                                             | `invoices/analyze.ts`                    |
| Audit tampering                                                   | Per-organization hash chain; verification endpoint reports the first broken sequence                                                                                                                                                                                                                                          | `services/audit.ts`                      |
| Session theft / CSRF                                              | httpOnly SameSite=Lax cookies (`__Host-` + Secure in production), SHA-256 hashed session tokens, custom-header CSRF guard, closed CORS, login rate limit and lockout                                                                                                                                                          | `http/`                                  |
| Privilege misuse                                                  | OWNER-only approval, payment, refund and mandate edits; only the approving owner may pay                                                                                                                                                                                                                                      | `requireRole`, guard `BUYER_MISMATCH`    |

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
the policy version (`trustrail-policy/1.3.0`) and a digest of the exact facts evaluated.

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
