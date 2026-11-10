import type { PolicyDecisionDto, ViolationDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Disclosure } from "@/components/ui/Disclosure";
import { Icons } from "@/components/shell/icons";
import { dateTime, money, truncateMiddle } from "@/lib/format";
import { checkDetail, checkLabel, violationCopy } from "@/lib/plain-language";
import { DecisionBadge } from "./DecisionBadge";

function EvidenceList({ evidence }: { evidence: Record<string, unknown> }) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-2xs">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-4">{k}</dt>
          <dd className="break-all text-ink-2">
            {typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * One reason TrustRail gave: a plain title and sentence first, then TrustRail's own message, the
 * code and its evidence behind "Technical details".
 */
export function ViolationItem({ violation }: { violation: ViolationDto }) {
  const block = violation.severity === "BLOCK";
  const copy = violationCopy(violation.code, violation.message);
  return (
    <li
      className={cn("rounded-lg border px-3 py-2.5", block ? "border-block-line bg-block-soft/60" : "border-review-line bg-review-soft/60")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={block ? "block" : "review"} label={`Severity: ${block ? "Blocks the cart" : "Needs your review"}`}>
          {block ? "Blocks" : "Review"}
        </Badge>
        <p className="text-sm font-semibold text-ink">{copy.title}</p>
      </div>
      {copy.sentence ? <p className="mt-1 text-sm text-ink-2">{copy.sentence}</p> : null}
      {violation.message && violation.message !== copy.sentence ? <p className="mt-1 text-xs text-ink-3">{violation.message}</p> : null}
      <details className="group mt-1.5">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-2xs font-medium text-ink-3 select-none hover:text-ink-2 [&::-webkit-details-marker]:hidden">
          Technical details
          <Icons.chevronDown className="size-3 transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-1 font-mono text-2xs font-medium text-ink-2">{violation.code}</p>
        {violation.evidence ? <EvidenceList evidence={violation.evidence} /> : null}
      </details>
    </li>
  );
}

/** TrustRail decision: verdict, reasons by severity, and every check that ran. */
export function DecisionPanel({ decision, currency = "USD" }: { decision: PolicyDecisionDto; currency?: string }) {
  const detail = (code: string, text: string) => checkDetail(code, text, (minor) => money(minor, currency));
  const blocks = decision.violations.filter((v) => v.severity === "BLOCK");
  const reviews = decision.violations.filter((v) => v.severity === "REVIEW");
  const passed = decision.checks.filter((c) => c.passed);
  const failed = decision.checks.filter((c) => !c.passed);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        decision.decision === "ALLOW" && "border-allow-line bg-allow-soft/40",
        decision.decision === "REVIEW_REQUIRED" && "border-review-line bg-review-soft/40",
        decision.decision === "BLOCK" && "border-block-line bg-block-soft/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icons.shield className="size-4 text-ink-2" />
        <p className="text-sm font-semibold text-ink">TrustRail decision</p>
        <DecisionBadge decision={decision.decision} />
        <span className="ml-auto text-xs text-ink-3">
          {passed.length} of {decision.checks.length} checks passed
        </span>
      </div>

      {decision.violations.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label="Policy violations">
          {[...blocks, ...reviews].map((v, i) => (
            <ViolationItem key={`${v.code}-${i}`} violation={v} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-allow">Nothing to flag: this cart is within your spend mandate.</p>
      )}

      {failed.length > 0 && decision.violations.length === 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-review">
          {failed.map((c) => (
            <li key={c.code}>
              {checkLabel(c.code)}: {detail(c.code, c.detail)}
            </li>
          ))}
        </ul>
      ) : null}

      <Disclosure className="mt-3 bg-surface" summary={`All checks (${passed.length} of ${decision.checks.length} passed)`}>
        <ul className="space-y-1.5">
          {decision.checks.map((c) => (
            <li key={c.code} className="flex gap-2 text-xs">
              {c.passed ? (
                <Icons.check className="mt-0.5 size-3.5 text-allow" strokeWidth={2.4} />
              ) : (
                <Icons.x className="mt-0.5 size-3.5 text-block" strokeWidth={2.4} />
              )}
              <span>
                <span className="sr-only">{c.passed ? "Passed: " : "Failed: "}</span>
                <span className="font-medium text-ink-2">{checkLabel(c.code)}</span>
                <span className="text-ink-3"> — {detail(c.code, c.detail)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-2 font-mono text-2xs leading-relaxed text-ink-4">
          policy {decision.policy_version} · mandate v{decision.mandate_version} · evaluated {dateTime(decision.evaluated_at)} · digest{" "}
          <span title={decision.input_digest}>{truncateMiddle(decision.input_digest, 12, 6)}</span>
          {decision.human_approval_required ? " · human approval required" : ""}
        </p>
      </Disclosure>
    </div>
  );
}
