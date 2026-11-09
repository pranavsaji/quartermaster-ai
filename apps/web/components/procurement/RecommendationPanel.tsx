import type { RecommendationDto } from "@qm/contracts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { AiModeBadge } from "./AiModeBadge";

export function RecommendationPanel({ recommendation }: { recommendation: RecommendationDto }) {
  return (
    <Card aria-labelledby="recommendation-title">
      <CardHeader
        id="recommendation-title"
        title="Recommendation"
        description="The agent's summary. It is advisory: TrustRail's deterministic decision on each cart is what governs payment."
        actions={<AiModeBadge mode={recommendation.ai_mode} />}
      />
      <CardBody>
        <p className="text-[14px] leading-relaxed text-ink">{recommendation.summary}</p>
        {recommendation.rationale.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {recommendation.rationale.map((r) => (
              <li key={r} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
