import { describe, expect, it } from "vitest";
import { detectPromptInjection } from "@qm/trustrail";
import { FRESH_ATTACKS_ROUND2, FRESH_ATTACKS_ROUND3, HELDOUT_ATTACKS } from "./fixtures/heldout-attacks";

/**
 * Recall on attack text the rules were not written from. Every set reports its misses, so a
 * failure (or a run with --reporter=verbose) shows exactly what the detector does not catch.
 */
function measure(attacks: [string, string][]) {
  const verdicts = attacks.map(([category, text]) => ({ category, text, v: detectPromptInjection(text) }));
  const quarantined = verdicts.filter((r) => r.v.quarantine).length;
  const flagged = verdicts.filter((r) => r.v.suspicious).length;
  const misses = verdicts
    .filter((r) => !r.v.quarantine)
    .map((r) => `${r.v.suspicious ? "suspicious " : "missed     "} [${r.category}] ${r.text.replace(/\n/g, "\\n")}`);
  return {
    total: attacks.length,
    quarantinedPct: (100 * quarantined) / attacks.length,
    flaggedPct: (100 * flagged) / attacks.length,
    misses,
  };
}

function report(name: string, m: ReturnType<typeof measure>) {
  // eslint-disable-next-line no-console -- the recall figures and misses are the point of this test's output
  console.info(
    `${name}: ${m.quarantinedPct.toFixed(1)}% quarantined, ${m.flaggedPct.toFixed(1)}% flagged of ${m.total}` +
      (m.misses.length ? `\n  not quarantined:\n  ${m.misses.join("\n  ")}` : ""),
  );
}

describe("held-out attack recall", () => {
  it("is a corpus of at least 60 distinct attacks across every family", () => {
    expect(HELDOUT_ATTACKS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(HELDOUT_ATTACKS.map(([, t]) => t)).size).toBe(HELDOUT_ATTACKS.length);
    expect(new Set(HELDOUT_ATTACKS.map(([c]) => c))).toEqual(
      new Set(["override", "authority", "roleplay", "wrapped", "split", "multilingual", "encoded", "financial", "reporting", "addressing"]),
    );
  });

  it("flags at least 90% and quarantines at least 80% of the held-out corpus", () => {
    const m = measure(HELDOUT_ATTACKS);
    report("held-out corpus", m);
    expect(m.flaggedPct, m.misses.join("\n")).toBeGreaterThanOrEqual(90);
    expect(m.quarantinedPct, m.misses.join("\n")).toBeGreaterThanOrEqual(80);
  });

  // Floors at the level measured when each fresh round was frozen: they guard against
  // regressions, they are not targets. Round 3 has never been tuned against, so its figure is
  // the estimate of recall on paraphrases nobody has seen.
  it("does not regress on the fresh rounds", () => {
    const round2 = measure(FRESH_ATTACKS_ROUND2);
    const round3 = measure(FRESH_ATTACKS_ROUND3);
    report("fresh round 2 (tuned against once)", round2);
    report("fresh round 3 (never tuned against)", round3);
    expect(round2.quarantinedPct).toBeGreaterThanOrEqual(90);
    expect(round3.quarantinedPct).toBeGreaterThanOrEqual(50);
    expect(round3.flaggedPct).toBeGreaterThanOrEqual(55);
  });
});
