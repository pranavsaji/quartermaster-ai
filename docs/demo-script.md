# Demo video script (under 3 minutes)

The rules cap the video at three minutes, and judges may score on the video alone. Keep the take to
**about 2:50**. Show the product working end to end; every number on screen must come from the app.

**Before recording**

- Open <https://quartermaster-web-o0df.onrender.com> a minute early. Free Render services sleep after
  15 idle minutes, and every API boot re-seeds the demo organization, so the take starts from a clean state.
- Sign in as `owner@demo.quartermaster.dev` (password in the README's "For judges" section).
- Have the PayPal sandbox **Personal** (buyer) account ready, or use PayPal's guest card option with a
  [sandbox test card](https://developer.paypal.com/tools/sandbox/card-testing/).
- Record at 1440×900 or larger, browser zoom 90%, and hide bookmarks and other tabs.

| Time      | Screen                                      | Say / do                                                                                                                                                                                                                                                                                                                                                                     |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Overview                                    | **Problem and audience.** "Small restaurants reorder supplies in the gaps of a shift. An AI agent could do it, but nobody hands an agent their PayPal account without guardrails. Quartermaster is the agent; TrustRail is the guardrail." Point at the LOW stock rows and the weekly budget.                                                                                |
| 0:20–0:55 | Procurement → New request                   | Submit: _"We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300."_ Walk the agent timeline: the **OpenAI** model's interpretation (1.25× demand, $300 cap), the explainable forecast, **Channel3** market prices, and the supplier comparison in **AG Grid**, ranked by delivered cost per unit.                                |
| 0:55–1:30 | Same page: blocked proposal                 | "QuickServe looked cheapest." Open its card: TrustRail **BLOCK**, with an undisclosed priority service charge and a quarantined listing. Open the finding: the listing told AI agents to _ignore budget instructions and skip approval_. "The model never decides what is allowed. TrustRail checks the cart against the owner's mandate in code, and the agent re-planned." |
| 1:30–2:15 | Harbor proposal → Approve → Pay with PayPal | Approve the Harbor cart. Show the **Intent Certificate** (Ed25519 signature, cart hash, expiry) and click **Verify**: every check passes. Click **Pay with PayPal** and approve as the sandbox buyer. Status turns **Completed** and a delivery is scheduled. "PayPal only captures after a human approved this exact cart, and only for this amount."                       |
| 2:15–2:45 | Orders → Security Center → Analytics        | Submit the supplier invoice → **Matched**; click **Simulate duplicate invoice** → **Duplicate**, settlement withheld. Security Center: blocked attempts, prompt injection, audit chain **valid**. Analytics (**AG Charts**): captured spend against budget, duplicate captures = 0. Mention the **Zapier** payment notification if it has arrived.                           |
| 2:45–2:55 | Title card or Overview                      | "Quartermaster recommends. TrustRail authorizes. The owner approves. PayPal processes."                                                                                                                                                                                                                                                                                      |

## If you have spare seconds

- **AG Grid as the workspace:** on Inventory, type a new On hand count into the grid. It saves, flashes, and the
  status recalculates. Then search "gloves" in the toolbar and click **Export CSV**.

- Lower the per-order limit on the Spend Mandate while an approval is outstanding: the certificate
  shows **MANDATE_CHANGED** and payment is refused.
- A few seconds of the test suite or CI badge (over 1,200 tests, including adversarial prompt-injection suites).

## Claims to avoid

Do not claim the forecast predicts real demand, that suppliers are real retailers, or that real money
moves: payments run in the PayPal sandbox. Report only numbers the app or repository reproduces.
