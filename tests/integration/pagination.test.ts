import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { securityFindings } from "@qm/database";
import { decodeCursor, encodeCursor } from "../../apps/api/src/services/pagination";
import { createHarness, type Client, type Harness } from "../helpers/harness";

let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
});
afterAll(async () => {
  await h.close();
});

describe("keyset pagination", () => {
  it("round-trips cursors and rejects malformed ones", () => {
    const at = new Date("2026-05-01T10:00:00.123Z");
    const id = "6f1c1b2e-6c0a-4b47-9c39-8d1a3c1f0e01";
    expect(decodeCursor(encodeCursor(at, id))).toEqual({ at, id });
    for (const bad of [
      undefined,
      "",
      "not-base64!",
      Buffer.from("2026-05-01|nope").toString("base64url"),
      Buffer.from(`garbage|${id}`).toString("base64url"),
      "x".repeat(300),
    ]) {
      expect(decodeCursor(bad)).toBeNull();
    }
  });

  it("returns every row exactly once when many rows share a timestamp", async () => {
    const orgId = (await owner.get("/auth/me")).body.user.organization.id as string;
    const at = new Date("2026-01-01T00:00:00.000Z");
    await h.ctx.db.insert(securityFindings).values(
      Array.from({ length: 23 }, (_, i) => ({
        organizationId: orgId,
        type: "POLICY_VIOLATION",
        severity: "LOW" as const,
        title: `Tie ${i}`,
        description: "Same timestamp",
        sourceKind: "test",
        evidence: {},
        createdAt: at,
      })),
    );
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 20; i++) {
      const res = await owner.get(`/security/events?limit=5&type=POLICY_VIOLATION${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      expect(res.status).toBe(200);
      seen.push(...res.body.items.filter((f: { title: string }) => f.title.startsWith("Tie ")).map((f: { id: string }) => f.id));
      cursor = res.body.next_cursor;
      if (!cursor) break;
    }
    expect(seen).toHaveLength(23);
    expect(new Set(seen).size).toBe(23);
  });

  it("pages purchase orders, decisions, requests and the audit log", async () => {
    for (const path of [
      "/purchase-orders?limit=2",
      "/security/decisions?limit=2",
      "/procurement/requests?limit=2",
      "/security/audit?limit=2",
    ]) {
      const res = await owner.get(path);
      expect(res.status, path).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body).toHaveProperty("next_cursor");
    }
    // A garbage cursor is treated as the first page, not an error.
    expect((await owner.get("/purchase-orders?cursor=zzz")).status).toBe(200);
  });
});
