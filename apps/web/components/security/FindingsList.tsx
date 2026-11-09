import Link from "next/link";
import type { SecurityFindingDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/format";
import { findingLabel, SEVERITY_TONES } from "@/lib/labels";

/** Pulls a human-readable excerpt out of a finding's evidence, if one exists. */
export function evidenceExcerpt(evidence: Record<string, unknown>): string | null {
  const keys = ["excerpt", "matched_text", "snippet", "text", "content", "pattern", "reason", "detail"];
  for (const key of keys) {
    const value = evidence[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      const strings = value.filter((v): v is string => typeof v === "string");
      if (strings.length > 0) return strings.join(" · ");
    }
  }
  return null;
}

export function Excerpt({ text }: { text: string }) {
  return (
    <blockquote className="mt-1.5 rounded-md border-l-2 border-block-line bg-block-soft/60 px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">
      <span className="sr-only">Evidence excerpt (untrusted content): </span>
      {text.length > 280 ? `${text.slice(0, 280)}…` : text}
    </blockquote>
  );
}

/** Compact list of TrustRail security findings with severity and evidence. */
export function FindingsList({
  findings,
  emptyTitle = "No security findings",
  emptyDescription = "TrustRail hasn't flagged anything here.",
  linkRequests = true,
}: {
  findings: SecurityFindingDto[];
  emptyTitle?: string;
  emptyDescription?: string;
  linkRequests?: boolean;
}) {
  if (findings.length === 0) return <EmptyState compact title={emptyTitle} description={emptyDescription} />;
  return (
    <ul className="divide-y divide-line">
      {findings.map((f) => {
        const excerpt = evidenceExcerpt(f.evidence);
        return (
          <li key={f.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={SEVERITY_TONES[f.severity]} dot label={`Severity: ${f.severity}`}>
                {f.severity}
              </Badge>
              <span className="text-[12px] font-medium text-ink-3">{findingLabel(f.type)}</span>
              <span className="ml-auto text-[12px] text-ink-4" title={f.created_at}>
                {relativeTime(f.created_at)}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] font-medium text-ink">{f.title}</p>
            {f.description ? <p className="mt-0.5 text-[13px] text-ink-3">{f.description}</p> : null}
            {excerpt ? <Excerpt text={excerpt} /> : null}
            <p className="mt-1.5 text-[12px] text-ink-4">
              Source: <span className="font-mono">{f.source_kind}</span>
              {linkRequests && f.related_request_id ? (
                <>
                  {" · "}
                  <Link href={`/procurement/${f.related_request_id}`} className="text-accent hover:underline">
                    View request
                  </Link>
                </>
              ) : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
