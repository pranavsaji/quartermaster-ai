// Quartermaster quickstart with the APIMatic-generated TypeScript SDK.
//
//   cd apimatic/sdk/typescript && npm install && npm run build && cd ../..
//   QM_EMAIL=owner@demo.quartermaster.dev QM_PASSWORD=... node examples/quickstart.mjs              # hosted demo
//   QM_BASE_URL=http://localhost:4000/api/v1 QM_EMAIL=... QM_PASSWORD=... node examples/quickstart.mjs   # local API
//
// Signs in, reads stock and the Spend Mandate, asks the agent to restock, and prints what
// TrustRail allowed or blocked. It never pays: payment needs the owner in the PayPal checkout.
import { randomUUID } from "node:crypto";
import { QuartermasterAiTrustRailApiClient, ServerEnvironment } from "../sdk/typescript/dist/esm/index.js";

const { QM_EMAIL: email, QM_PASSWORD: password, QM_BASE_URL: baseUrl } = process.env;
if (!email || !password) {
  console.error("Set QM_EMAIL and QM_PASSWORD (see the README's 'For judges' section).");
  process.exit(1);
}
const local = Boolean(baseUrl?.startsWith("http://"));
const environment = local
  ? { serverEnvironment: ServerEnvironment.Local, serverOptions: { baseUrl } }
  : { serverEnvironment: ServerEnvironment.Hosted, ...(baseUrl ? { serverOptions: { baseUrl } } : {}) };
const CSRF = "quartermaster";
const dollars = (minor) => `$${(minor / 100).toFixed(2)}`;

// 1. Sign in. The session arrives as an httpOnly cookie, read from the response headers.
const anonymous = new QuartermasterAiTrustRailApiClient(environment);
const signedIn = await anonymous.accountsApi.login({ xRequestedWith: CSRF, body: { email, password } }).asApiResult();
if (!signedIn.ok) throw new Error(`Sign-in failed (${signedIn.status}): ${signedIn.error.message}`);
const cookies = signedIn.headers.getSetCookie?.() ?? [signedIn.headers.get("set-cookie") ?? ""];
const token = cookies.map((c) => /qm_session=([^;]+)/.exec(c)?.[1]).find(Boolean);
if (!token) throw new Error("No session cookie in the sign-in response");
const client = new QuartermasterAiTrustRailApiClient({ ...environment, ...(local ? { session: token } : { secureSession: token }) });
const me = signedIn.value.user;
console.log(`Signed in as ${me.name} (${me.role}) at ${me.organization.name}`);

// 2. Stock that needs attention, and the owner's spending rules.
const { items } = await client.inventoryApi.listInventory();
for (const i of items.filter((i) => i.status !== "OK")) console.log(`  ${i.status.padEnd(8)} ${i.name}: ${i.onHand} ${i.unit} on hand`);
const { mandate, budget } = await client.trustRail.getSpendMandate();
console.log(`Spend Mandate v${mandate.version}: ${dollars(budget.remainingMinor)} left of ${dollars(budget.limitMinor)} this week`);

// 3. Ask the agent, then let it research (forecast, market prices, supplier comparison, TrustRail).
const request = await client.procurement.createProcurementRequest({
  xRequestedWith: CSRF,
  idempotencyKey: randomUUID(),
  body: { instruction: "We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300." },
});
const researched = await client.procurement.researchProcurementRequest({ id: request.id, xRequestedWith: CSRF });
for (const p of researched.proposals) {
  console.log(`  ${p.status.padEnd(9)} ${p.supplierName.padEnd(28)} ${dollars(p.totalMinor)}`);
  for (const v of p.policyDecision?.violations ?? []) console.log(`            ${v.code}: ${v.message}`);
}
const web = local ? baseUrl.replace(/\/api\/v1$/, "").replace(":4000", ":3000") : "https://quartermaster-web-o0df.onrender.com";
console.log(`Open ${web}/procurement/${request.id} to approve and pay with PayPal.`);
