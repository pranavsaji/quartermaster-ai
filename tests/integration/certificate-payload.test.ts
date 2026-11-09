import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { intentCertificates } from "@qm/database";
import { loadCertificate, toSigned, verifyStoredCertificate } from "../../apps/api/src/services/certificates";
import { parseCertificatePayload } from "../../apps/api/src/services/orders";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { approvedIntent, relaxMandate } from "../helpers/flows";

/**
 * The signed certificate payload is read from a JSONB column. It is parsed, not cast: a payload
 * that is not well-formed fails verification (and cannot be used to sign off a capture) instead
 * of crashing the verifier with a TypeError.
 */
let h: Harness;
let owner: Client;
let orgId: string;

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
  orgId = (await owner.get("/auth/me")).body.user.organization.id;
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await h.close();
});

describe("stored certificate payloads", () => {
  it("verifies a well-formed payload and fails closed on a malformed one", async () => {
    const { intentId } = await approvedIntent(owner, "CLN-GLOVES");
    const cert = await loadCertificate(h.ctx.db, orgId, intentId);
    expect(parseCertificatePayload(cert.payload)).toEqual(cert.payload);
    expect((await verifyStoredCertificate(h.ctx.db, orgId, cert, h.ctx.now())).valid).toBe(true);
    expect(toSigned(cert).payload.intent_id).toBe(intentId);

    for (const payload of [
      { ...cert.payload, approved_amount_minor: String(cert.payload.approved_amount_minor) },
      { ...cert.payload, injected: true },
      { ...cert.payload, certificate_version: 2 },
      ["not", "a", "payload"],
    ]) {
      await h.ctx.db
        .update(intentCertificates)
        .set({ payload: payload as Record<string, unknown> })
        .where(eq(intentCertificates.id, intentId));
      const tampered = await loadCertificate(h.ctx.db, orgId, intentId);
      const v = await verifyStoredCertificate(h.ctx.db, orgId, tampered, h.ctx.now());
      expect(v).toMatchObject({ valid: false, status: "PAYLOAD_MISMATCH" });
      expect(v.checks).toEqual([expect.objectContaining({ code: "PAYLOAD_SHAPE", passed: false })]);
      expect(() => toSigned(tampered)).toThrow(expect.objectContaining({ code: "CERTIFICATE_MALFORMED", status: 500 }));
    }

    // Reading it over the API is an explicit, typed error with fixed text.
    vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    const res = await owner.get(`/intents/${intentId}/verify`);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({
      code: "CERTIFICATE_MALFORMED",
      message: "A stored intent certificate is malformed and cannot be used.",
    });
  });
});
