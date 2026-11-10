import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";
import { fakeChannel3 } from "../helpers/channel3";
import { relaxMandate } from "../helpers/flows";

/**
 * The published OpenAPI spec (docs/openapi.json, used for the APIMatic SDKs and docs portal) must
 * describe what the API really returns: real responses are validated against its schemas.
 */
interface Operation {
  responses: Record<string, { content?: { "application/json"?: { schema: unknown } } }>;
}
const spec = JSON.parse(readFileSync(path.resolve(__dirname, "../../docs/openapi.json"), "utf8")) as {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
};

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats.default(ajv);
ajv.addSchema({ $id: "spec", components: spec.components });

function validatorFor(method: string, route: string, status: string) {
  const schema = spec.paths[route]?.[method]?.responses[status]?.content?.["application/json"]?.schema;
  if (!schema) throw new Error(`No ${status} schema for ${method.toUpperCase()} ${route}`);
  const rebased = JSON.parse(JSON.stringify(schema).replaceAll('"#/components/', '"spec#/components/')) as object;
  return ajv.compile(rebased);
}

function expectConforms(method: string, route: string, status: number, body: unknown) {
  const validate = validatorFor(method, route, String(status));
  const ok = validate(body);
  expect(ok, `${method.toUpperCase()} ${route}: ${ajv.errorsText(validate.errors, { separator: "\n" })}`).toBe(true);
}

describe("OpenAPI spec matches real responses", () => {
  let h: Harness;
  let owner: Client;
  let requestId: string;

  beforeAll(async () => {
    // With market data, so Channel3 quotes and references are validated too.
    h = await createHarness({ channel3Fetch: fakeChannel3().fetch });
    owner = await h.agent("owner");
    await relaxMandate(owner);
    const created = await owner.post("/procurement/requests", { instruction: DEMO_INSTRUCTION });
    requestId = created.body.id as string;
    expectConforms("post", "/procurement/requests", 201, created.body);
  });
  afterAll(async () => h.close());

  it.each([
    ["/config/public", "get"],
    ["/auth/me", "get"],
    ["/inventory", "get"],
    ["/suppliers", "get"],
    ["/members", "get"],
    ["/procurement/requests", "get"],
    ["/mandates/current", "get"],
    ["/purchase-orders", "get"],
    ["/deliveries", "get"],
    ["/invoices", "get"],
    ["/security/events", "get"],
    ["/security/decisions", "get"],
    ["/security/audit", "get"],
    ["/security/audit/verify", "get"],
    ["/security/paypal-notifications", "get"],
    ["/analytics/summary", "get"],
  ])("GET %s", async (route) => {
    const res = await owner.get(route);
    expect(res.status).toBe(200);
    expectConforms("get", route, 200, res.body);
  });

  it("research, the request detail and a supplier with its catalog", async () => {
    const researched = await owner.post(`/procurement/requests/${requestId}/research`);
    expect(researched.status).toBe(200);
    expectConforms("post", "/procurement/requests/{id}/research", 200, researched.body);
    const market = (researched.body as { market: { quotes: unknown[] }[] }).market;
    expect(market.flatMap((m) => m.quotes).length).toBeGreaterThan(0);
    const detail = await owner.get(`/procurement/requests/${requestId}`);
    expectConforms("get", "/procurement/requests/{id}", 200, detail.body);
    const supplierId = ((await owner.get("/suppliers")).body.items as { id: string }[])[0]!.id;
    expectConforms("get", "/suppliers/{id}", 200, (await owner.get(`/suppliers/${supplierId}`)).body);
  });

  it("error responses use ApiError", async () => {
    const res = await owner.get("/suppliers/0f8fad5b-d9cb-469f-a165-70867728950e");
    expect(res.status).toBe(404);
    const validate = ajv.compile({ $ref: "spec#/components/schemas/ApiError" });
    expect(validate(res.body), ajv.errorsText(validate.errors)).toBe(true);
    // The schemas are strict enough to catch drift: a wrong shape fails.
    expect(validate({ error: { message: "missing code" } })).toBe(false);
    expect(validatorFor("get", "/inventory", "200")({ items: [{ id: "x" }] })).toBe(false);
  });
});
