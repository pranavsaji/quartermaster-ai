import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { DEMO_CREDENTIALS } from "@qm/database";
import { createHarness, type Harness } from "../helpers/harness";

/**
 * Behind Render the API sees: client → Render edge → web (Next.js rewrite) → API. With
 * TRUST_PROXY=2 each browser gets its own rate-limit bucket instead of sharing the proxy's.
 */
let h: Harness;

beforeAll(async () => {
  h = await createHarness({ extraEnv: { TRUST_PROXY: "2", RATE_LIMIT_PER_MINUTE: "5", LOGIN_RATE_LIMIT_PER_ACCOUNT: "2", LOGIN_RATE_LIMIT_PER_IP: "50" } });
});
afterAll(async () => {
  await h.close();
});

/** X-Forwarded-For as the API receives it: browser address, then the edge's internal address. */
const via = (client: string) => `${client}, 10.200.0.7`;
const config = (client: string) => request(h.app).get("/api/v1/config/public").set("X-Forwarded-For", via(client));
const login = (client: string, email: string) =>
  request(h.app).post("/api/v1/auth/login").set("X-Forwarded-For", via(client)).set("X-Requested-With", "quartermaster").send({ email, password: "wrong-password-123" });

describe("rate limits behind trusted proxies", () => {
  it("gives distinct forwarded clients separate global buckets", async () => {
    for (let i = 0; i < 5; i++) expect((await config("203.0.113.10")).status).toBe(200);
    const limited = await config("203.0.113.10");
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect((await config("203.0.113.11")).status).toBe(200);
  });

  it("keys the sign-in limiter on client IP and email, so one attacker cannot lock everyone out", async () => {
    const victim = DEMO_CREDENTIALS.owner.email;
    expect((await login("198.51.100.1", victim)).status).toBe(401);
    expect((await login("198.51.100.1", victim.toUpperCase())).status).toBe(401);
    // Same IP + same (normalised) email is now limited…
    expect((await login("198.51.100.1", ` ${victim} `)).status).toBe(429);
    // …but the attacker's other attempts and other users' sign-ins are unaffected.
    expect((await login("198.51.100.1", "someone-else@example.com")).status).toBe(401);
    expect((await login("198.51.100.2", victim)).status).toBe(401);
  });
});
