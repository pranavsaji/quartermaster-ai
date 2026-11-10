import { afterEach, describe, expect, it } from "vitest";
import { hashTokenSnapshot, parseHashToken, resetHashToken, takeHashToken } from "@/lib/link-token";

const TOKEN = "Abc_def-0123456789xyzABCDEFGHIJ";

afterEach(() => {
  resetHashToken();
  window.history.replaceState(null, "", "/");
});

describe("link tokens", () => {
  it("parses #token=… and rejects malformed or missing values", () => {
    expect(parseHashToken(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(parseHashToken(`token=${TOKEN}`)).toBe(TOKEN);
    expect(parseHashToken("#token=short")).toBeNull();
    expect(parseHashToken("#token=has%20space%20in%20it-and-is-long")).toBeNull();
    expect(parseHashToken("")).toBeNull();
  });

  it("takes the token from the fragment and removes it from the address bar", () => {
    window.history.replaceState(null, "", `/reset-password?from=email#token=${TOKEN}`);
    expect(takeHashToken()).toBe(TOKEN);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname + window.location.search).toBe("/reset-password?from=email");
  });

  it("ignores a token in the query string", () => {
    window.history.replaceState(null, "", `/reset-password?token=${TOKEN}`);
    expect(takeHashToken()).toBeNull();
  });

  it("keeps returning the captured token on the same page after the fragment is gone", () => {
    window.history.replaceState(null, "", `/invite#token=${TOKEN}`);
    expect(hashTokenSnapshot()).toBe(TOKEN);
    expect(window.location.hash).toBe("");
    expect(hashTokenSnapshot()).toBe(TOKEN);
    window.history.replaceState(null, "", "/reset-password");
    expect(hashTokenSnapshot()).toBeNull();
  });
});
