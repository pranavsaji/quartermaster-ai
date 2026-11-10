import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { ADVERSARIAL_LISTING_TEXT, auditEvents, policyDecisions, securityFindings } from "@qm/database";
import type { RedTeamResultDto, SupplierDto } from "@qm/contracts";
import { createHarness, type Client, type Harness } from "../helpers/harness";

/** Red-team TrustRail: detection on the caller's own listing, and the worst-case purchase evaluated against the real mandate. */
let h: Harness;
let viewer: Client;
let approved: SupplierDto;

beforeAll(async () => {
  h = await createHarness();
  const owner = await h.agent("owner");
  viewer = await h.agent("viewer");
  const suppliers = (await owner.get("/suppliers")).body.items as SupplierDto[];
  approved = suppliers.find((s) => s.approved && s.active)!;
  expect(approved).toBeTruthy();
});
afterAll(async () => {
  await h.close();
});

const run = async (body: Record<string, unknown>) => {
  const res = await viewer.post("/security/red-team", {
    category: "food_packaging",
    unit_price_minor: 4_000,
    quantity: 2,
    supplier_id: null,
    ...body,
  });
  return res;
};
const rows = async () =>
  Promise.all([securityFindings, policyDecisions, auditEvents].map(async (t) => (await h.ctx.db.select({ n: count() }).from(t))[0]!.n));

describe("POST /security/red-team", () => {
  it("quarantines the seeded hostile listing and blocks the purchase it asks for", async () => {
    const res = await run({ listing_text: ADVERSARIAL_LISTING_TEXT });
    expect(res.status).toBe(200);
    const out = res.body as RedTeamResultDto;
    expect(out.detection.quarantined).toBe(true);
    expect(out.detection.signals.length).toBeGreaterThan(0);
    expect(out.worst_case.decision).toBe("BLOCK");
    expect(out.worst_case.approvable).toBe(false);
    expect(out.worst_case.violations.map((v) => v.code)).toEqual(expect.arrayContaining(["SUPPLIER_NOT_APPROVED"]));
  });

  it("still blocks when detection sees nothing: an unapproved supplier is refused on policy alone", async () => {
    const res = await run({ listing_text: "Premium kraft takeout boxes, 200 per case. Same-day dispatch." });
    const out = res.body as RedTeamResultDto;
    expect(out.detection.quarantined).toBe(false);
    expect(out.worst_case.decision).toBe("BLOCK");
    expect(out.worst_case.violations.map((v) => v.code)).toContain("SUPPLIER_NOT_APPROVED");
  });

  it("blocks a quarantined listing even from an approved supplier", async () => {
    const res = await run({ listing_text: ADVERSARIAL_LISTING_TEXT, supplier_id: approved.id });
    const out = res.body as RedTeamResultDto;
    expect(out.worst_case.supplier.approved).toBe(true);
    expect(out.worst_case.decision).toBe("BLOCK");
    expect(out.worst_case.violations.map((v) => v.code)).toContain("QUARANTINED_SOURCE");
  });

  it("bounds a clean listing from an approved supplier by the mandate", async () => {
    const small = (await run({ listing_text: "Kraft takeout boxes, 200 per case.", supplier_id: approved.id })).body as RedTeamResultDto;
    expect(small.worst_case.decision).not.toBe("BLOCK");
    expect(small.worst_case.cart.total_minor).toBeGreaterThan(8_000);
    expect(small.bound.human_approval_required).toBe(true);

    const big = (
      await run({
        listing_text: "Kraft takeout boxes, 200 per case.",
        supplier_id: approved.id,
        unit_price_minor: small.bound.per_order_limit_minor,
      })
    ).body as RedTeamResultDto;
    expect(big.worst_case.decision).toBe("BLOCK");
    expect(big.worst_case.violations.map((v) => v.code)).toContain("PER_ORDER_LIMIT_EXCEEDED");
  });

  it("refuses a restricted category and a recurring subscription", async () => {
    const wine = (await run({ listing_text: "Case of house red.", supplier_id: approved.id, category: "alcohol" }))
      .body as RedTeamResultDto;
    expect(wine.worst_case.violations.map((v) => v.code)).toContain("CATEGORY_NOT_ALLOWED");
    const sub = (
      await run({ listing_text: "Monthly descaler plan.", supplier_id: approved.id, category: "cleaning_supplies", recurring: true })
    ).body as RedTeamResultDto;
    expect(sub.worst_case.violations.map((v) => v.code)).toContain("SUBSCRIPTION_NOT_ALLOWED");
  });

  it("stores nothing", async () => {
    const before = await rows();
    await run({ listing_text: ADVERSARIAL_LISTING_TEXT });
    expect(await rows()).toEqual(before);
  });

  it("validates input and scopes suppliers to the workspace", async () => {
    expect((await run({ listing_text: "" })).status).toBe(400);
    expect((await run({ listing_text: "x", quantity: 0 })).status).toBe(400);
    expect((await run({ listing_text: "x", supplier_id: "00000000-0000-4000-8000-000000000000" })).status).toBe(404);
    expect((await h.anonymous().post("/security/red-team", { listing_text: "x" })).status).toBe(401);
  });
});
