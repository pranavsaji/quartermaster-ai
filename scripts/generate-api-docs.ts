import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ROUTES } from "./api-routes";

/**
 * Generates docs/openapi.json (OpenAPI 3.1, request bodies from the Zod contracts) and
 * postman/quartermaster.postman_collection.json from the shared route table.
 *   pnpm docs:api
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Quartermaster AI + TrustRail API",
    version: "1.0.0",
    description:
      "Autonomous procurement secured by TrustRail. Amounts are integer minor units. Mutations require `X-Requested-With: quartermaster`; routes marked idempotent require an `Idempotency-Key` header. Response shapes are defined in packages/contracts/src/dto.ts.",
    license: { name: "Apache-2.0" },
  },
  servers: [{ url: "http://localhost:4000/api/v1" }],
  components: {
    securitySchemes: { session: { type: "apiKey", in: "cookie", name: "qm_session" } },
    parameters: {
      IdempotencyKey: { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", minLength: 8, maxLength: 128 } },
      Csrf: { name: "X-Requested-With", in: "header", required: true, schema: { type: "string", const: "quartermaster" } },
    },
  },
  paths: {} as Record<string, Record<string, unknown>>,
};

for (const r of ROUTES) {
  const params: unknown[] = [];
  for (const m of r.path.matchAll(/\{(\w+)\}/g))
    params.push({ name: m[1], in: "path", required: true, schema: { type: "string", format: "uuid" } });
  if (r.method !== "GET" && r.path !== "/webhooks/paypal") params.push({ $ref: "#/components/parameters/Csrf" });
  if (r.idempotent) params.push({ $ref: "#/components/parameters/IdempotencyKey" });
  const op: Record<string, unknown> = {
    summary: r.summary,
    tags: [r.tag],
    parameters: params,
    ...(r.auth === false ? { security: [] } : { security: [{ session: [] }] }),
    ...(r.role ? { "x-required-role": r.role } : {}),
    responses: {
      [r.response === "204" ? "204" : "200"]: { description: r.response },
      "400": { description: "Validation error (ApiError)" },
      ...(r.auth === false
        ? {}
        : { "401": { description: "Not signed in" }, "403": { description: "Insufficient role or missing CSRF header" } }),
      ...(r.idempotent
        ? { "409": { description: "Idempotency key in progress / conflict" }, "422": { description: "Policy refusal or key reuse" } }
        : {}),
    },
  };
  if (r.body) {
    op.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: z.toJSONSchema(r.body, { io: "input", unrepresentable: "any" }),
          ...(r.example ? { example: r.example } : {}),
        },
      },
    };
  }
  (openapi.paths[r.path] ??= {})[r.method.toLowerCase()] = op;
}

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
