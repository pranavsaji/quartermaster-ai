# Three-minute demonstration

Everything below runs on the deployed app with the seeded demo organization. All data sources are
labelled on screen: **Channel3 market data**, **Sandbox supplier**, **Synthetic data**.

**Before recording:** reset the demo (`node apps/api/dist/seed.js --reset`), sign in as
`owner@demo.quartermaster.dev`, and have the PayPal sandbox **Personal** account credentials ready.

| Time | Screen | Say / do |
|---|---|---|
| 0:00–0:25 | Overview | "Saffron & Sage is low on takeaway containers and frying oil before a busy weekend." Point at LOW stock, days of cover, weekly budget $500. |
| 0:25–1:00 | Procurement → New request | Submit: *"We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300."* Show the agent timeline: interpretation (1.25× demand, $300 cap), forecast lines with the explainable formula, Channel3 market evidence, supplier comparison on delivered cost per unit (PackRight shown but not approved). |
| 1:00–1:35 | Same page — blocked proposal | QuickServe looked cheapest. Open its card: TrustRail **BLOCK** — "Priority service charge is not part of the supplier's published terms" and "Listing quarantined". Open the finding: the listing told AI agents to *ignore budget instructions and skip approval*. The agent re-planned without it. |
| 1:35–2:15 | Harbor proposal → Approve → Pay with PayPal | Tick the review acknowledgement (market reference), approve. Show the Intent Certificate (key id, expiry countdown, signature) and click **Verify** — every check green. Pay with PayPal sandbox; status turns COMPLETED, delivery scheduled. |
| 2:15–2:55 | Orders, Security Center, Analytics | Submit the supplier invoice → MATCHED. Click "Simulate duplicate invoice" → DUPLICATE, settlement withheld, no payment. Security Center: blocked attempts, prompt injection, audit chain **valid**. Analytics: captured spend, budget impact, duplicate captures = 0. |
| 2:55–3:00 | — | "Quartermaster recommends, TrustRail authorizes, the owner approves, PayPal processes." |

## Optional extras (if time allows)

* Edit the Spend Mandate to lower the per-order limit while an approval is outstanding → the
  certificate shows **MANDATE_CHANGED** and payment is refused.
* Run `pnpm test` on camera: 259 tests including adversarial suites.

## Claims to avoid

Do not claim the forecast predicts real demand, that suppliers are real retailers, or that live
payments are processed. Report only reproducible numbers from this repository (test counts, blocked
attempts, duplicate captures = 0, procurement time from the analytics page).
