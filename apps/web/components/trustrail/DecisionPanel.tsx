import type { PolicyDecisionDto, ViolationDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { Disclosure } from "@/components/ui/Disclosure";
import { Icons } from "@/components/shell/icons";
import { dateTime, humanize, truncateMiddle } from "@/lib/format";
import { DecisionBadge } from "./DecisionBadge";

function EvidenceList({ evidence }: { evidence: Record<string, unknown> }) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11.5px]">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-4">{k}</dt>
          <dd className="break-all text-ink-2">{typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ViolationItem({ violation }: { violation: ViolationDto }) {
  const block = violation.severity === "BLOCK";
  return (
    <li className={cn("rounded-lg border px-3 py-2.5", block ? "border-block-line bg-block-soft/60" : "border-review-line bg-review-soft/60")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={block ? "block" : "review"} label={`Severity: ${block ? "Block" : "Review"}`}>
          {block ? "BLOCK" : "REVIEW"}
        </Badge>
        <code className="font-mono text-[11.5px] font-medium text-ink-2">{violation.code}</code>
      </div>
      <p className="mt-1 text-[13px] text-ink">{violation.message}</p>
      {violation.evidence ? <EvidenceList evidence={violation.evidence} /> : null}
    </li>
  );
}

/** TrustRail decision: verdict, violations by severity, and every check that ran. */
export function DecisionPanel({ decision }: { decision: PolicyDecisionDto }) {
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
        <p className="text-[13.5px] font-semibold text-ink">TrustRail decision</p>
        <DecisionBadge decision={decision.decision} />
        <span className="ml-auto text-[12px] text-ink-3">
          {passed.length}/{decision.checks.length} checks passed
        </span>
      </div>

      {decision.violations.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label="Policy violations">
          {[...blocks, ...reviews].map((v, i) => (
            <ViolationItem key={`${v.code}-${i}`} violation={v} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-allow">No violations: this cart is within your spend mandate.</p>
      )}

      {failed.length > 0 && decision.violations.length === 0 ? (
        <ul className="mt-3 space-y-1 text-[12.5px] text-review">
          {failed.map((c) => (
            <li key={c.code}>
              {humanize(c.code)}: {c.detail}
            </li>
          ))}
        </ul>
      ) : null}

      <Disclosure className="mt-3 bg-surface" summary={`All checks (${passed.length} of ${decision.checks.length} passed)`}>
        <ul className="space-y-1.5">
          {decision.checks.map((c) => (
            <li key={c.code} className="flex gap-2 text-[12.5px]">
              {c.passed ? (
                <Icons.check className="mt-0.5 size-3.5 text-allow" strokeWidth={2.4} />
              ) : (
                <Icons.x className="mt-0.5 size-3.5 text-block" strokeWidth={2.4} />
              )}
              <span>
                <span className="sr-only">{c.passed ? "Passed: " : "Failed: "}</span>
                <span className="font-medium text-ink-2">{humanize(c.code)}</span>
                <span className="text-ink-3"> — {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Disclosure>

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-4">
        policy {decision.policy_version} · mandate v{decision.mandate_version} · evaluated {dateTime(decision.evaluated_at)} ·
        digest <span title={decision.input_digest}>{truncateMiddle(decision.input_digest, 12, 6)}</span>
        {decision.human_approval_required ? " · human approval required" : ""}
      </p>
    </div>
  );
}
