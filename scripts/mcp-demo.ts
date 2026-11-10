/**
 * Acts as an MCP client (like Claude Desktop or Cursor would) against a running local stack:
 * spawns the Quartermaster MCP server over stdio, then reads the Spend Mandate, creates a request,
 * researches it, re-evaluates it with TrustRail and prints the verdict. Nothing is approved or
 * paid: the MCP server has no such tools, and PayPal is never called.
 *
 *   pnpm dev                                   # API on :4000, web on :3000
 *   QM_PASSWORD=… pnpm mcp:demo ["instruction"]
 *
 * QM_API_URL (default http://localhost:4000), QM_APP_URL (default http://localhost:3000) and
 * QM_EMAIL (default the sample MANAGER) are optional. QM_PASSWORD falls back to DEMO_USER_PASSWORD.
 */
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const DEFAULT_INSTRUCTION = "We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.";

interface Proposal {
  number: string;
  supplier: string;
  status: string;
  allowed: boolean;
  trustrail_decision: string | null;
  total: string | null;
  owner_must_acknowledge: string[];
  reasons: { code: string; severity: string }[];
}
interface RequestSummary {
  request_id: string;
  status: string;
  trustrail: { outcome: string; allowed_proposals: number; blocked_proposals: number; next_step: string };
  proposals: Proposal[];
  quarantined_sources: { kind: string; supplier?: string; sku?: string }[];
  security_findings: { type: string; severity: string }[];
  owner_action: { approve_in_app: string; note: string };
}

const password = process.env.QM_PASSWORD ?? process.env.DEMO_USER_PASSWORD;
if (!password) {
  console.error("Set QM_PASSWORD (or DEMO_USER_PASSWORD) to the sample account password.");
  process.exit(1);
}
const env = {
  ...getDefaultEnvironment(),
  QM_API_URL: process.env.QM_API_URL ?? "http://localhost:4000",
  QM_APP_URL: process.env.QM_APP_URL ?? "http://localhost:3000",
  QM_EMAIL: process.env.QM_EMAIL ?? "manager@demo.quartermaster.dev",
  QM_PASSWORD: password,
};
const instruction = process.argv.slice(2).join(" ").trim() || DEFAULT_INSTRUCTION;

const client = new Client({ name: "quartermaster-mcp-demo", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", fileURLToPath(new URL("../apps/mcp/src/index.ts", import.meta.url))],
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env,
  stderr: "inherit",
});

async function call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[])[0]?.text ?? "{}";
  if (res.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text) as T;
}

function printVerdict(r: RequestSummary) {
  console.log(
    `\nTrustRail verdict: ${r.trustrail.outcome} (${r.trustrail.allowed_proposals} allowed, ${r.trustrail.blocked_proposals} blocked)`,
  );
  for (const p of r.proposals) {
    const mark = p.allowed ? "ALLOWED" : "BLOCKED";
    const codes = p.reasons.map((v) => `${v.code}${v.severity === "REVIEW" ? " (owner reviews)" : ""}`).join(", ") || "no violations";
    console.log(`  ${mark.padEnd(8)} ${p.number}  ${p.supplier.padEnd(28)} ${String(p.total).padStart(12)}  ${codes}`);
  }
  if (r.quarantined_sources.length > 0) {
    console.log("  Quarantined sources:");
    for (const q of r.quarantined_sources)
      console.log(`    - ${q.kind}${q.supplier ? `: ${q.supplier}` : ""}${q.sku ? ` (${q.sku})` : ""}`);
  }
  if (r.security_findings.length > 0) {
    console.log(`  Security findings: ${r.security_findings.map((f) => `${f.type}/${f.severity}`).join(", ")}`);
  }
  console.log(`\nNext: ${r.trustrail.next_step}`);
  console.log(`Owner approves here: ${r.owner_action.approve_in_app}`);
  console.log(r.owner_action.note);
}

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(`Connected to the Quartermaster MCP server as ${env.QM_EMAIL}. Tools: ${tools.map((t) => t.name).join(", ")}`);

  const mandate = await call<{ mandate: Record<string, unknown>; budget: Record<string, unknown> }>("get_spend_mandate");
  console.log(
    `\n1. Spend Mandate v${String(mandate.mandate.version)}: weekly budget ${String(mandate.mandate.weekly_budget)}, ` +
      `per-order limit ${String(mandate.mandate.per_order_limit)}, remaining this week ${String(mandate.budget.remaining)}`,
  );

  const created = await call<{ request_id: string }>("create_purchase_request", { instruction });
  console.log(`2. Created request ${created.request_id}: "${instruction}"`);

  console.log("3. Researching (forecast, supplier comparison, TrustRail evaluation)...");
  const researched = await call<RequestSummary>("research_request", { request_id: created.request_id });
  console.log(`   Research finished: ${researched.status}`);

  console.log("4. Re-evaluating the open proposals with TrustRail...");
  printVerdict(await call<RequestSummary>("evaluate_request", { request_id: created.request_id }));
} catch (err) {
  console.error(`\nDemo failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
