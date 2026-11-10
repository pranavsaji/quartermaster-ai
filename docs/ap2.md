# TrustRail and the Agent Payments Protocol (AP2)

Google's [Agent Payments Protocol](https://ap2-protocol.org/ap2/specification/) (AP2, now developed under the FIDO Alliance,
Apache-2.0) addresses the same problem as TrustRail: proving that a payment an agent starts is one the human authorised. TrustRail
is **modelled on AP2's mandate idea, not an implementation of it**. This page maps the two so the difference is explicit.

| TrustRail                                                  | AP2 v0.2                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Spend Mandate (owner's standing rules, versioned)          | open Checkout and Payment Mandates (constraints)                                            |
| per-order limit                                            | `payment.amount_range.max`                                                                  |
| weekly budget                                              | `payment.budget` with `payment.agent_recurrence` (not a calendar period)                    |
| approved suppliers                                         | `checkout.allowed_merchants` / `payment.allowed_payees`                                     |
| restricted categories, subscriptions, market-price premium | no standard constraint (would need custom constraints, which a strict AP2 verifier rejects) |
| immutable purchase order + `cart_hash`                     | merchant-signed `checkout_jwt` + `checkout_hash`                                            |
| Intent Certificate (owner approves one exact cart)         | closed Checkout + closed Payment Mandate, human-present flow                                |
| `approved_amount_minor` + currency                         | `payment_amount` (integer minor units, ISO 4217)                                            |
| supplier's PayPal merchant id, checked before capture      | `payee.id`                                                                                  |
| expiry, single use (stored status + budget reservation)    | `exp`; no re-presentation, receipts                                                         |
| capture guard (re-verify, re-run policy, check PayPal)     | the merchant / payment-processor verification steps                                         |

## What is different

- **Format and keys.** AP2 mandates are SD-JWT verifiable credentials (ES256 in the examples). TrustRail certificates are
  canonical JSON signed with Ed25519, and the spec advises against deterministic signatures such as Ed25519 for the checkout JWT.
- **Who signs.** In AP2 the merchant signs the checkout and the user's trusted surface signs the mandates. Here TrustRail signs on
  the owner's approval, and sandbox suppliers sign nothing.
- **Who verifies.** AP2 lets other parties verify. Only TrustRail verifies its certificates today; PayPal does not see them.
- **Richer policy.** TrustRail enforces rules AP2 has no standard constraint for (categories, subscriptions, price against market
  evidence, duplicates, over-purchase against a forecast) and re-runs them at capture time.

## Path to interoperability

Export each approved order as an AP2-shaped pair (a derived view; the Ed25519 certificate stays the source of truth): sign the
canonical purchase order as an ES256 JWT for `checkout_jwt`, set `checkout_hash` to its base64url SHA-256, and emit
`mandate.checkout.1` and `mandate.payment.1` objects with `payee`, `payment_amount`, `iat` and `exp`, carrying the mandate version
under a reverse-DNS claim. This is not built yet.

Sources: [AP2 specification](https://ap2-protocol.org/ap2/specification/), [checkout mandate](https://ap2-protocol.org/ap2/checkout_mandate/),
[payment mandate](https://ap2-protocol.org/ap2/payment_mandate/), [changelog (v0.1 → v0.2)](https://github.com/google-agentic-commerce/AP2/blob/main/CHANGELOG.md).
