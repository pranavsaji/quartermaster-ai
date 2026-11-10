import type { RecommendationDto } from "@qm/contracts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { plainText } from "@/lib/plain-language";
import { AiModeBadge } from "./AiModeBadge";

export function RecommendationPanel({ recommendation }: { recommendation: RecommendationDto }) {
  return (
    <Card aria-labelledby="recommendation-title">
      <CardHeader
        id="recommendation-title"
        title="Recommendation"
        description="Quartermaster's summary. It is advice only: TrustRail's decision on each cart is what decides whether it can be paid."
        actions={<AiModeBadge mode={recommendation.ai_mode} />}
      />
      <CardBody>
        <p className="text-base leading-relaxed text-ink">{plainText(recommendation.summary)}</p>
        {recommendation.rationale.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {recommendation.rationale.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {plainText(r)}
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
