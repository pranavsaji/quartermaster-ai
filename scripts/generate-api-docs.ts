import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGenerator } from "ts-json-schema-generator";
import { z } from "zod";
import * as contracts from "@qm/contracts";
import { ROUTES } from "./api-routes";

/**
 * Generates docs/openapi.json (OpenAPI 3.1, request bodies from the Zod contracts) and
 * postman/quartermaster.postman_collection.json from the shared route table.
 *   pnpm docs:api
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Schema = Record<string, unknown>;

/* ----------------------------------------------------------- Response schemas from the TS DTOs */

const CONTRACTS = path.join(root, "packages", "contracts");
const generators = {
  dto: createGenerator({
    path: path.join(CONTRACTS, "src/dto.ts"),
    tsconfig: path.join(CONTRACTS, "tsconfig.json"),
    expose: "export",
    topRef: true,
    skipTypeCheck: true,
    jsDoc: "extended",
  }),
  responses: createGenerator({
    path: path.join(CONTRACTS, "src/responses.ts"),
    tsconfig: path.join(CONTRACTS, "tsconfig.json"),
    expose: "export",
    topRef: true,
    skipTypeCheck: true,
    jsDoc: "extended",
  }),
};
const schemas: Record<string, Schema> = {};

/** Rewrites JSON Schema definition refs to OpenAPI component refs. */
const toComponentRefs = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value).replaceAll("#/definitions/", "#/components/schemas/"));

/** Adds a contract type (and everything it references) to components.schemas; returns its $ref. */
function typeRef(name: string): Schema {
  if (!schemas[name]) {
    const gen = name.endsWith("Response") ? generators.responses : generators.dto;
    const out = gen.createSchema(name);
    for (const [k, v] of Object.entries(out.definitions ?? {})) schemas[k] ??= toComponentRefs(v) as Schema;
  }
  return { $ref: `#/components/schemas/${name}` };
}

/** Splits "a: X, b: Y[]" at top-level commas. */
function fields(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "<" || ch === "{" || ch === "[") depth++;
    if (ch === ">" || ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * The route table describes responses compactly: "PaymentDto", "Page<X>", "{ item: X }",
 * "{ items: X[] }", "{ status: 'sent' }". Anything else fails the build, so the spec never
 * silently loses a response shape.
 */
function responseSchema(desc: string): Schema {
  const page = /^Page<(\w+)>$/.exec(desc);
  if (page) {
    return {
      type: "object",
      properties: {
        items: { type: "array", items: typeRef(page[1]!) },
        next_cursor: { type: ["string", "null"], description: "Pass as `cursor` for the next page; null on the last page." },
      },
      required: ["items", "next_cursor"],
    };
  }
  if (/^\w+$/.test(desc)) return typeRef(desc);
  const obj = /^\{(.*)\}$/.exec(desc);
  if (!obj) throw new Error(`Unparseable response description: ${desc}`);
  const properties: Record<string, Schema> = {};
  for (const f of fields(obj[1]!)) {
    const m = /^(\w+):\s*(.+)$/.exec(f);
    if (!m) throw new Error(`Unparseable response field "${f}" in ${desc}`);
    const [, key, type] = m as unknown as [string, string, string];
    const literal = /^'([^']*)'$/.exec(type);
    properties[key] = literal
      ? { type: "string", const: literal[1] }
      : type.endsWith("[]")
        ? { type: "array", items: typeRef(type.slice(0, -2)) }
        : typeRef(type);
  }
  return { type: "object", properties, required: Object.keys(properties) };
}

/* ------------------------------------------------------------ Request schemas from Zod contracts */

/** The exported name of each Zod schema, so request bodies become named, reusable components. */
const zodNames = new Map<unknown, string>(
  Object.entries(contracts)
    .filter(([, v]) => v instanceof z.ZodType)
    .map(([k, v]) => [v, k]),
);

function requestRef(body: z.ZodType): Schema {
  const name = zodNames.get(body);
  if (!name) throw new Error("Request body schema is not exported from @qm/contracts");
  if (!schemas[name]) {
    const { $schema: _drop, ...json } = z.toJSONSchema(body, { io: "input", unrepresentable: "any" }) as Schema;
    schemas[name] = json;
  }
  return { $ref: `#/components/schemas/${name}` };
}

/* --------------------------------------------------------------------------- Operation ids */

const VERBS: Record<string, string> = { GET: "get", POST: "create", PUT: "update" };
const camel = (parts: string[]) => parts.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join("");
const singular = (w: string) =>
  w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.endsWith("ses") ? w.slice(0, -2) : w.endsWith("s") ? w.slice(0, -1) : w;

/**
 * Stable method names for generated SDKs: `listProcurementRequests`, `getProcurementRequest`,
 * `approveProcurementRequest`, `createPaymentRefund`... Collisions fail the build.
 */
function operationId(method: string, route: string): string {
  const segs = route.split("/").filter(Boolean);
  const words = segs.flatMap((s) => (s.startsWith("{") ? [] : s.split("-")));
  const endsWithParam = segs[segs.length - 1]?.startsWith("{");
  const last = segs[segs.length - 1] ?? "";
  // POST /x/{id}/approve -> approveX ; POST /auth/login -> login
  const ACTIONS = new Set([
    "login",
    "logout",
    "signup",
    "research",
    "evaluate",
    "approve",
    "reject",
    "capture",
    "sync",
    "refund",
    "verify",
    "receive",
    "delay",
    "analyze",
    "forecast",
    "resolve",
    "revoke",
    "remove",
    "accept",
    "lookup",
    "forgot",
    "reset",
    "change",
    "test",
  ]);
  if (method === "POST" && ACTIONS.has(last)) {
    const subject = words
      .slice(0, -1)
      .filter((w) => !["auth", "password"].includes(w))
      .map(singular);
    return camel([last, ...subject]);
  }
  if (method === "GET" && !endsWithParam && words.length && !["me", "public", "current", "health", "summary", "verify"].includes(last)) {
    return camel(["list", ...words.map((w, i) => (i === words.length - 1 ? w : singular(w)))]);
  }
  return camel([VERBS[method]!, ...words.map(singular)]);
}

/** Names that read better in SDKs than the derived ones. */
const OPERATION_IDS: Record<string, string> = {
  "GET /config/public": "getPublicConfig",
  "POST /auth/password/forgot": "requestPasswordReset",
  "POST /auth/password/reset": "resetPassword",
  "POST /auth/password/change": "changePassword",
  "POST /client-errors": "reportClientError",
  "GET /auth/me": "getCurrentUser",
  "POST /inventory": "createInventoryItem",
  "PUT /inventory/{id}": "updateInventoryItem",
  "POST /inventory/{id}/adjustments": "adjustInventoryItem",
  "POST /suppliers/{id}/catalog": "createCatalogItem",
  "PUT /suppliers/{id}/catalog/{itemId}": "updateCatalogItem",
  "POST /members/invitations": "inviteMember",
  "POST /members/invitations/{id}/revoke": "revokeInvitation",
  "POST /members/{id}/password-reset": "issueMemberResetLink",
  "GET /mandates/current": "getSpendMandate",
  "PUT /mandates/current": "updateSpendMandate",
  "GET /intents/{id}/verify": "verifyIntentCertificate",
  "POST /intents/{id}/paypal-order": "createPayPalOrder",
  "POST /webhooks/paypal": "receivePayPalWebhook",
  "GET /security/events": "listSecurityFindings",
  "GET /security/decisions": "listPolicyDecisions",
  "GET /security/audit": "listAuditEvents",
  "GET /security/audit/verify": "verifyAuditChain",
  "GET /analytics/summary": "getAnalyticsSummary",
  "GET /security/paypal-notifications": "getPayPalNotificationStatus",
  "GET /ops/health": "getPlatformHealth",
  "GET /ops/errors": "listTrackedErrors",
  "POST /ops/errors/{id}/resolve": "resolveTrackedError",
  "POST /ops/alerts/test": "sendTestAlert",
};

/** Success statuses other than 200 (checked against the route handlers). */
const SUCCESS_STATUS: Record<string, string> = {
  "POST /auth/signup": "201",
  "POST /invitations/accept": "201",
  "POST /members/invitations": "201",
  "POST /inventory": "201",
  "POST /suppliers": "201",
  "POST /suppliers/{id}/catalog": "201",
  "POST /procurement/requests": "201",
  "POST /auth/password/forgot": "202",
  "POST /client-errors": "202",
};

const TAG_DESCRIPTIONS: Record<string, string> = {
  System: "Public configuration and browser error reports.",
  Auth: "Sign-up, sign-in (httpOnly session cookie), password reset and change.",
  Team: "Members, roles and one-time invitation links.",
  Inventory: "Stock levels, adjustments and the reorder forecast.",
  Suppliers: "Suppliers, their fee terms and catalog listings (screened for prompt injection).",
  Procurement: "Natural-language requests, agent research, TrustRail evaluation and owner approval.",
  Mandate: "The owner's Spend Mandate: budgets, limits, approved suppliers and categories.",
  Payments: "Intent Certificates and PayPal (sandbox) orders, captures and refunds.",
  Webhooks: "Signed PayPal notifications.",
  Orders: "Purchase orders, deliveries and invoices.",
  Security: "Findings, policy decisions, the hash-chained audit log and PayPal notification health.",
  Analytics: "Spend, budget and security outcomes.",
  Operations: "Platform health and error tracking (operators only).",
};

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Quartermaster AI + TrustRail API",
    version: "1.0.0",
    summary: "AI procurement for restaurants, with deterministic spend controls and PayPal sandbox payments.",
    description:
      "Autonomous procurement secured by TrustRail. Amounts are integer minor units (cents). Sign in with `POST /auth/login` (or `/auth/signup`): the API sets an httpOnly session cookie. Every mutation requires the header `X-Requested-With: quartermaster`; routes marked idempotent also require an `Idempotency-Key`. Errors share one shape (`ApiError`) with a stable `code`.",
    license: { name: "Apache-2.0", identifier: "Apache-2.0" },
    contact: { name: "Quartermaster", url: "https://github.com/pranavsaji/quartermaster-ai" },
  },
  servers: [
    { url: "https://quartermaster-web-o0df.onrender.com/api/v1", description: "Hosted demo (PayPal sandbox)" },
    { url: "http://localhost:4000/api/v1", description: "Local development" },
  ],
  tags: [] as { name: string; description: string }[],
  components: {
    securitySchemes: {
      session: {
        type: "apiKey",
        in: "cookie",
        name: "qm_session",
        description: "Session cookie set by sign-in (named `__Host-qm_session` on HTTPS deployments).",
      },
    },
    parameters: {
      IdempotencyKey: {
        name: "Idempotency-Key",
        in: "header",
        required: true,
        description: "A unique key per user action; retries with the same key return the first result.",
        schema: { type: "string", minLength: 8, maxLength: 128 },
      },
      Csrf: {
        name: "X-Requested-With",
        in: "header",
        required: true,
        description: "CSRF guard: must be `quartermaster` on every mutation.",
        schema: { type: "string", const: "quartermaster" },
      },
    },
    schemas,
    responses: {} as Record<string, Schema>,
  },
  paths: {} as Record<string, Record<string, unknown>>,
};

const errorContent = () => ({ "application/json": { schema: typeRef("ApiError") } });
openapi.components.responses = {
  BadRequest: { description: "The request failed validation (`BAD_REQUEST`, details list each field).", content: errorContent() },
  Unauthorized: { description: "Not signed in, or the session expired (`UNAUTHENTICATED`).", content: errorContent() },
  Forbidden: { description: "The signed-in role is too low (`ROLE_REQUIRED`) or the CSRF header is missing.", content: errorContent() },
  Conflict: { description: "The request conflicts with current state; see `code`.", content: errorContent() },
  Unprocessable: { description: "Refused by policy (for example `CAPTURE_REFUSED`); see `code`.", content: errorContent() },
  TooManyRequests: { description: "Rate limited (`RATE_LIMITED`).", content: errorContent() },
  NotFound: { description: "No such resource in your workspace.", content: errorContent() },
};
const err = (name: string) => ({ $ref: `#/components/responses/${name}` });

/** Realistic values for the Postman `{{variables}}` in route examples, so spec examples validate. */
const SAMPLE_VALUES: Record<string, string> = {
  password: "correct-horse-battery-staple",
  new_password: "a-new-strong-passphrase",
  reset_token: "3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  invite_token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
  purchase_order_id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  cart_hash: `sha256:${"9f".repeat(32)}`,
  paypal_order_id: "5O190127TN364715T",
};
const specExample = (example: unknown): unknown =>
  JSON.parse(
    JSON.stringify(example).replace(/\{\{(\w+)\}\}/g, (_whole, name: string) => {
      const value = SAMPLE_VALUES[name];
      if (value === undefined) throw new Error(`No sample value for {{${name}}} in an OpenAPI example`);
      return value;
    }),
  );

const seenIds = new Set<string>();
for (const r of ROUTES) {
  const params: unknown[] = [];
  for (const m of r.path.matchAll(/\{(\w+)\}/g))
    params.push({
      name: m[1],
      in: "path",
      required: true,
      description: `${m[1] === "id" ? "Resource" : m[1]} id (UUID).`,
      schema: { type: "string", format: "uuid" },
    });
  if (r.method !== "GET" && r.path !== "/webhooks/paypal") params.push({ $ref: "#/components/parameters/Csrf" });
  if (r.idempotent) params.push({ $ref: "#/components/parameters/IdempotencyKey" });
  const key = `${r.method} ${r.path}`;
  const id = OPERATION_IDS[key] ?? operationId(r.method, r.path);
  if (seenIds.has(id)) throw new Error(`Duplicate operationId ${id} for ${r.method} ${r.path}`);
  seenIds.add(id);
  const roleNote = r.role ? ` Requires the ${r.role} role.` : "";
  const success =
    r.response === "204"
      ? { "204": { description: "Done; no content." } }
      : {
          [SUCCESS_STATUS[key] ?? "200"]: {
            description: r.summary,
            content: { "application/json": { schema: responseSchema(r.response) } },
          },
        };
  const op: Record<string, unknown> = {
    operationId: id,
    summary: r.summary,
    description: `${r.summary}.${roleNote}${r.idempotent ? " Idempotent: send an `Idempotency-Key`." : ""}`,
    tags: [r.tag],
    parameters: params,
    ...(r.auth === false ? { security: [] } : { security: [{ session: [] }] }),
    ...(r.role ? { "x-required-role": r.role } : {}),
    responses: {
      ...success,
      ...(r.body || r.method === "GET" ? { "400": err("BadRequest") } : {}),
      ...(r.auth === false ? {} : { "401": err("Unauthorized"), "403": err("Forbidden") }),
      ...(r.path.includes("{") ? { "404": err("NotFound") } : {}),
      ...(r.method !== "GET" ? { "409": err("Conflict") } : {}),
      ...(r.idempotent ? { "422": err("Unprocessable") } : {}),
      "429": err("TooManyRequests"),
    },
  };
  if (r.body) {
    op.requestBody = {
      required: true,
      content: { "application/json": { schema: requestRef(r.body), ...(r.example ? { example: specExample(r.example) } : {}) } },
    };
  }
  (openapi.paths[r.path] ??= {})[r.method.toLowerCase()] = op;
}
openapi.tags = [...new Set(ROUTES.map((r) => r.tag))].map((name) => ({ name, description: TAG_DESCRIPTIONS[name] ?? name }));

writeFileSync(path.join(root, "docs", "openapi.json"), `${JSON.stringify(openapi, null, 2)}\n`);

const folders = new Map<string, unknown[]>();
for (const r of ROUTES) {
  const headers = [
    ...(r.method !== "GET"
      ? [
          { key: "Content-Type", value: "application/json" },
          { key: "X-Requested-With", value: "quartermaster" },
        ]
      : []),
    ...(r.idempotent ? [{ key: "Idempotency-Key", value: "{{$guid}}" }] : []),
  ];
  const rawPath = r.path.replace(
    /\{id\}/g,
    `{{${r.tag === "Payments" && r.path.startsWith("/payments") ? "payment_id" : r.path.startsWith("/intents") ? "intent_id" : r.path.startsWith("/deliveries") ? "delivery_id" : r.path.startsWith("/inventory") ? "inventory_item_id" : r.path.startsWith("/purchase-orders") ? "purchase_order_id" : "request_id"}}}`,
  );
  const item = {
    name: r.summary,
    request: {
      method: r.method,
      header: headers,
      url: { raw: `{{baseUrl}}${rawPath}`, host: ["{{baseUrl}}"], path: rawPath.split("/").filter(Boolean) },
      ...(r.method !== "GET"
        ? { body: { mode: "raw", raw: JSON.stringify(r.example ?? {}, null, 2), options: { raw: { language: "json" } } } }
        : {}),
    },
    event: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            `pm.test("status is not a server error", () => pm.expect(pm.response.code).to.be.below(500));`,
            ...(r.path === "/procurement/requests" && r.method === "POST"
              ? [`if (pm.response.code === 201) pm.collectionVariables.set("request_id", pm.response.json().id);`]
              : []),
            ...(r.path.endsWith("/research")
              ? [
                  `const p = (pm.response.json().proposals || []).find(x => x.status === "PROPOSED");`,
                  `if (p) { pm.collectionVariables.set("purchase_order_id", p.id); pm.collectionVariables.set("cart_hash", p.cart_hash); }`,
                  `pm.test("TrustRail blocked at least one cart", () => pm.expect((pm.response.json().proposals || []).some(x => x.status === "BLOCKED")).to.be.true);`,
                ]
              : []),
            ...(r.path.endsWith("/approve")
              ? [`if (pm.response.code === 200) pm.collectionVariables.set("intent_id", pm.response.json().certificate.id);`]
              : []),
            ...(r.path.endsWith("/paypal-order")
              ? [
                  `if (pm.response.code === 200) { pm.collectionVariables.set("payment_id", pm.response.json().payment.id); pm.collectionVariables.set("paypal_order_id", pm.response.json().paypal_order_id); }`,
                ]
              : []),
          ],
        },
      },
    ],
  };
  if (!folders.has(r.tag)) folders.set(r.tag, []);
  folders.get(r.tag)!.push(item);
}

const collection = {
  info: {
    name: "Quartermaster AI + TrustRail",
    description:
      "Procurement, TrustRail authorization and PayPal sandbox payments. Run the folders in order for the full journey. Generated by scripts/generate-api-docs.ts.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    "baseUrl=http://localhost:4000/api/v1",
    "password=",
    "request_id=",
    "purchase_order_id=",
    "cart_hash=",
    "intent_id=",
    "payment_id=",
    "paypal_order_id=",
    "delivery_id=",
    "inventory_item_id=",
  ].map((v) => {
    const [key, value] = v.split("=");
    return { key, value };
  }),
  item: [...folders.entries()].map(([name, item]) => ({ name, item })),
};
writeFileSync(path.join(root, "postman", "quartermaster.postman_collection.json"), `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Wrote docs/openapi.json (${ROUTES.length} operations) and the Postman collection.`);
